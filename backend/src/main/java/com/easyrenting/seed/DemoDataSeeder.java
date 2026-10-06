package com.easyrenting.seed;

import com.easyrenting.chat.ChatDtos.ConversationDto;
import com.easyrenting.chat.ChatService;
import com.easyrenting.config.AppProperties;
import com.easyrenting.notification.Notification;
import com.easyrenting.notification.NotificationRepository;
import com.easyrenting.notification.NotificationType;
import com.easyrenting.property.Amenity;
import com.easyrenting.property.Furnishing;
import com.easyrenting.property.Property;
import com.easyrenting.property.PropertyRepository;
import com.easyrenting.property.PropertyRequest;
import com.easyrenting.property.PropertyStatus;
import com.easyrenting.property.PropertyType;
import com.easyrenting.property.TenantPreference;
import com.easyrenting.seed.SeedCatalog.SeedLocality;
import com.easyrenting.shortlist.Shortlist;
import com.easyrenting.shortlist.ShortlistRepository;
import com.easyrenting.storage.StorageService;
import com.easyrenting.user.Role;
import com.easyrenting.user.User;
import com.easyrenting.user.UserRepository;
import com.easyrenting.verification.DocumentType;
import com.easyrenting.verification.VerificationDocument;
import com.easyrenting.verification.VerificationDocumentRepository;
import com.easyrenting.visit.Visit;
import com.easyrenting.visit.VisitRepository;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Seeds demo accounts, ~60 listings and sample activity under the {@code demo} profile. Idempotent: does nothing
 * if the demo admin already exists. Generation is deterministic (fixed random seed).
 */
@Component
@Profile("demo")
public class DemoDataSeeder implements ApplicationRunner {

    static final String PASSWORD = "Password@123";
    static final String ADMIN_EMAIL = "admin@easyrenting.in";

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final String[] ADJECTIVES = {"Spacious", "Sunlit", "Modern", "Cozy", "Premium", "Well-maintained",
            "Bright", "Elegant", "Airy", "Newly renovated"};

    private final UserRepository users;
    private final PropertyRepository properties;
    private final ShortlistRepository shortlists;
    private final VisitRepository visits;
    private final NotificationRepository notifications;
    private final VerificationDocumentRepository documents;
    private final StorageService storage;
    private final ChatService chat;
    private final PasswordEncoder passwordEncoder;
    private final JdbcClient jdbc;
    private final TransactionTemplate transactions;
    private final Clock clock;
    private final ZoneId zone;

    public DemoDataSeeder(UserRepository users, PropertyRepository properties, ShortlistRepository shortlists,
                          VisitRepository visits, NotificationRepository notifications,
                          VerificationDocumentRepository documents, StorageService storage, ChatService chat,
                          PasswordEncoder passwordEncoder, JdbcClient jdbc, TransactionTemplate transactions,
                          Clock clock, AppProperties appProperties) {
        this.users = users;
        this.properties = properties;
        this.shortlists = shortlists;
        this.visits = visits;
        this.notifications = notifications;
        this.documents = documents;
        this.storage = storage;
        this.chat = chat;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.clock = clock;
        this.zone = appProperties.timezone();
    }

    @Override
    public void run(ApplicationArguments args) {
        if (users.findByEmail(ADMIN_EMAIL).isPresent()) {
            log.info("Demo data already present, skipping seed");
            return;
        }
        log.info("Seeding demo data...");
        Seeded seeded = transactions.execute(status -> seedCore());
        transactions.executeWithoutResult(status -> seedActivity(seeded));
        log.info("Demo data seeded: {} listings, demo password '{}'", seeded.listings().size(), PASSWORD);
    }

    private record Seeded(User owner, User owner2, User newOwner, User tenant, List<Property> listings) {
    }

    private Seeded seedCore() {
        Instant now = clock.instant();
        String hash = passwordEncoder.encode(PASSWORD);
        users.save(new User("EasyRenting Admin", ADMIN_EMAIL, "9000000001", hash, Role.ADMIN));
        User owner = users.save(new User("Rajesh Sharma", "owner@easyrenting.in", "9876543210", hash, Role.OWNER));
        User owner2 = users.save(new User("Priya Nair", "owner2@easyrenting.in", "9845012345", hash, Role.OWNER));
        User newOwner = users.save(new User("Arjun Mehta", "newowner@easyrenting.in", "9820098200", hash, Role.OWNER));
        User tenant = users.save(new User("Ananya Iyer", "tenant@easyrenting.in", "9988776655", hash, Role.TENANT));
        owner.submitVerification(now.minus(Duration.ofDays(40)));
        owner.approveVerification(now.minus(Duration.ofDays(39)));
        owner2.submitVerification(now.minus(Duration.ofDays(25)));
        owner2.approveVerification(now.minus(Duration.ofDays(24)));
        seedPendingVerification(newOwner, now);

        Random random = new Random(42);
        List<Property> listings = new ArrayList<>();
        int index = 0;
        for (SeedLocality locality : SeedCatalog.LOCALITIES) {
            for (int i = 0; i < locality.listings(); i++) {
                User listingOwner = index % 2 == 0 ? owner : owner2;
                listings.add(properties.save(new Property(listingOwner, listing(locality, i, index, random))));
                index++;
            }
        }
        // Listings of the not-yet-verified owner stay hidden until an admin approves them.
        properties.save(new Property(newOwner, listing(SeedCatalog.LOCALITIES.get(0), 1, index++, random)));
        properties.save(new Property(newOwner, listing(SeedCatalog.LOCALITIES.get(9), 1, index, random)));
        addImages(listings, random);
        properties.flush();
        spreadCreationDates(listings, random, now);
        return new Seeded(owner, owner2, newOwner, tenant, listings);
    }

    private PropertyRequest listing(SeedLocality locality, int localIndex, int globalIndex, Random random) {
        boolean showcase = localIndex == 0;
        int bhk = showcase ? 2 : pickBhk(random);
        PropertyType type = pickType(locality, bhk, random);
        Furnishing furnishing = showcase ? Furnishing.SEMI_FURNISHED : Furnishing.values()[random.nextInt(3)];
        TenantPreference preference = showcase ? TenantPreference.FAMILY : pickPreference(random);
        long rent = roundTo500(locality.oneBhkRent() * bhkFactor(bhk) * (showcase ? 1.0 : 0.9 + random.nextDouble() * 0.25));
        int area = areaFor(bhk, random);
        int totalFloors = type == PropertyType.APARTMENT ? 4 + random.nextInt(18) : 1 + random.nextInt(3);
        int floor = random.nextInt(totalFloors + 1);
        String society = locality.societies().get(random.nextInt(locality.societies().size()));
        String landmark = locality.landmarks().get(random.nextInt(locality.landmarks().size()));
        EnumSet<Amenity> amenities = pickAmenities(type, furnishing, locality, random);
        if (showcase) {
            amenities.addAll(EnumSet.of(Amenity.PARKING, Amenity.LIFT, Amenity.SECURITY, Amenity.POWER_BACKUP));
        }
        String title = title(bhk, type, furnishing, society, locality, globalIndex);
        String description = description(bhk, type, furnishing, preference, society, landmark, floor, random);
        double lat = locality.latitude() + (random.nextDouble() - 0.5) * 0.018;
        double lng = locality.longitude() + (random.nextDouble() - 0.5) * 0.018;
        LocalDate availableFrom = LocalDate.now(clock.withZone(zone)).plusDays(random.nextInt(50) - 10);
        long maintenance = type == PropertyType.APARTMENT ? 1500 + 500L * random.nextInt(8) : 0;
        return new PropertyRequest(title, description, type, bhk, Math.max(1, bhk + random.nextInt(2) - (bhk > 2 ? 1 : 0)),
                area, furnishing, preference, rent, rent * locality.depositMonths(), maintenance, availableFrom,
                floor, totalFloors, SeedCatalog.FACINGS.get(random.nextInt(SeedCatalog.FACINGS.size())),
                (100 + random.nextInt(900)) + ", " + society + ", near " + landmark,
                locality.name(), locality.city(), locality.state(), locality.pincode(), lat, lng,
                List.copyOf(amenities), PropertyStatus.ACTIVE);
    }

    private static int pickBhk(Random random) {
        int roll = random.nextInt(100);
        if (roll < 8) {
            return 0;
        }
        if (roll < 33) {
            return 1;
        }
        if (roll < 70) {
            return 2;
        }
        return roll < 92 ? 3 : 4;
    }

    private static PropertyType pickType(SeedLocality locality, int bhk, Random random) {
        int roll = random.nextInt(100);
        if (bhk == 0) {
            return roll < 50 ? PropertyType.STUDIO : PropertyType.APARTMENT;
        }
        if (bhk == 1 && roll < 15 && locality.oneBhkRent() < 17_000) {
            return PropertyType.PG;
        }
        if (bhk >= 3 && roll < 15 && locality.city().equals("Bengaluru")) {
            return PropertyType.VILLA;
        }
        if (bhk >= 2 && roll < 25) {
            return PropertyType.INDEPENDENT_HOUSE;
        }
        return PropertyType.APARTMENT;
    }

    private static TenantPreference pickPreference(Random random) {
        int roll = random.nextInt(100);
        if (roll < 40) {
            return TenantPreference.ANY;
        }
        if (roll < 65) {
            return TenantPreference.FAMILY;
        }
        if (roll < 80) {
            return TenantPreference.BACHELOR_MALE;
        }
        return roll < 90 ? TenantPreference.BACHELOR_FEMALE : TenantPreference.COMPANY;
    }

    private static double bhkFactor(int bhk) {
        return switch (bhk) {
            case 0 -> 0.6;
            case 1 -> 1.0;
            case 2 -> 1.6;
            case 3 -> 2.3;
            default -> 3.2;
        };
    }

    private static int areaFor(int bhk, Random random) {
        return switch (bhk) {
            case 0 -> 350 + random.nextInt(150);
            case 1 -> 550 + random.nextInt(200);
            case 2 -> 950 + random.nextInt(300);
            case 3 -> 1350 + random.nextInt(450);
            default -> 2000 + random.nextInt(800);
        };
    }

    private static EnumSet<Amenity> pickAmenities(PropertyType type, Furnishing furnishing, SeedLocality locality,
                                                  Random random) {
        EnumSet<Amenity> set = EnumSet.noneOf(Amenity.class);
        boolean premium = locality.oneBhkRent() >= 22_000;
        if (type == PropertyType.APARTMENT || type == PropertyType.STUDIO) {
            set.add(Amenity.LIFT);
            set.add(Amenity.SECURITY);
            addIf(set, Amenity.POWER_BACKUP, random, 80);
            addIf(set, Amenity.GYM, random, premium ? 60 : 35);
            addIf(set, Amenity.SWIMMING_POOL, random, premium ? 45 : 20);
            addIf(set, Amenity.CLUB_HOUSE, random, 30);
            addIf(set, Amenity.PLAY_AREA, random, 40);
            addIf(set, Amenity.GAS_PIPELINE, random, 35);
        } else {
            addIf(set, Amenity.SECURITY, random, 50);
            addIf(set, Amenity.POWER_BACKUP, random, 40);
        }
        addIf(set, Amenity.PARKING, random, type == PropertyType.PG ? 30 : 75);
        addIf(set, Amenity.PET_FRIENDLY, random, 25);
        if (furnishing != Furnishing.UNFURNISHED) {
            addIf(set, Amenity.AC, random, furnishing == Furnishing.FULLY_FURNISHED ? 80 : 35);
            addIf(set, Amenity.WIFI, random, type == PropertyType.PG ? 100 : 30);
        }
        if (furnishing == Furnishing.FULLY_FURNISHED || type == PropertyType.PG) {
            addIf(set, Amenity.WASHING_MACHINE, random, 75);
            addIf(set, Amenity.FRIDGE, random, 85);
        }
        return set;
    }

    private static void addIf(EnumSet<Amenity> set, Amenity amenity, Random random, int percent) {
        if (random.nextInt(100) < percent) {
            set.add(amenity);
        }
    }

    private static String title(int bhk, PropertyType type, Furnishing furnishing, String society,
                                SeedLocality locality, int index) {
        String size = bhk == 0 ? "1 RK" : bhk + " BHK";
        String kind = switch (type) {
            case APARTMENT -> "Apartment";
            case INDEPENDENT_HOUSE -> "Independent House";
            case VILLA -> "Villa";
            case PG -> "PG Room";
            case STUDIO -> "Studio";
        };
        String furnished = switch (furnishing) {
            case FULLY_FURNISHED -> "Fully Furnished";
            case SEMI_FURNISHED -> "Semi-Furnished";
            case UNFURNISHED -> "Unfurnished";
        };
        String place = type == PropertyType.APARTMENT || type == PropertyType.STUDIO ? society : locality.name();
        String title = ADJECTIVES[index % ADJECTIVES.length] + " " + (type == PropertyType.STUDIO ? "" : size + " ")
                + furnished + " " + kind + " in " + place
                + (place.equals(locality.name()) ? "" : ", " + locality.name());
        return title.length() > 120 ? title.substring(0, 120) : title;
    }

    private static String description(int bhk, PropertyType type, Furnishing furnishing, TenantPreference preference,
                                      String society, String landmark, int floor, Random random) {
        String home = switch (type) {
            case APARTMENT -> (bhk == 0 ? "compact 1 RK" : bhk + " BHK") + " apartment on the "
                    + (floor == 0 ? "ground" : ordinal(floor)) + " floor of " + society;
            case INDEPENDENT_HOUSE -> bhk + " BHK independent house in a calm residential lane";
            case VILLA -> bhk + " BHK villa with a private garden inside a gated community";
            case PG -> "private PG room with attached bathroom, meals and housekeeping included";
            case STUDIO -> "self-contained studio in " + society;
        };
        String highlightA = SeedCatalog.HIGHLIGHTS.get(random.nextInt(SeedCatalog.HIGHLIGHTS.size()));
        String highlightB = SeedCatalog.HIGHLIGHTS.get(random.nextInt(SeedCatalog.HIGHLIGHTS.size()));
        String furnishingText = switch (furnishing) {
            case FULLY_FURNISHED -> "Comes fully furnished with beds, sofa, dining table, wardrobes, fridge, washing "
                    + "machine and ACs — just bring your suitcase.";
            case SEMI_FURNISHED -> "Semi-furnished with wardrobes, modular kitchen, geyser, fans and lights.";
            case UNFURNISHED -> "Unfurnished, giving you the freedom to set it up your way.";
        };
        String audience = switch (preference) {
            case FAMILY -> "Preferred for families.";
            case BACHELOR_MALE -> "Open to working bachelors (male).";
            case BACHELOR_FEMALE -> "Open to working women / female students.";
            case COMPANY -> "Suitable for company lease.";
            case ANY -> "Open to families and working professionals.";
        };
        String rule = SeedCatalog.HOUSE_RULES.get(random.nextInt(SeedCatalog.HOUSE_RULES.size()));
        return "Well-kept " + home + ", " + (2 + random.nextInt(9)) + " minutes from " + landmark + ". The home has "
                + highlightA + (highlightA.equals(highlightB) ? "" : ", and " + highlightB) + ". " + furnishingText
                + " Grocery stores, pharmacies, schools and hospitals are all close by. " + audience + " " + rule;
    }

    private static String ordinal(int n) {
        int mod100 = n % 100;
        String suffix = mod100 >= 11 && mod100 <= 13 ? "th" : switch (n % 10) {
            case 1 -> "st";
            case 2 -> "nd";
            case 3 -> "rd";
            default -> "th";
        };
        return n + suffix;
    }

    private static long roundTo500(double value) {
        return Math.round(value / 500.0) * 500;
    }

    private static void addImages(List<Property> listings, Random random) {
        for (int i = 0; i < listings.size(); i++) {
            int images = 3 + random.nextInt(3);
            for (int k = 0; k < images; k++) {
                String id = SeedCatalog.IMAGE_IDS.get((i * 3 + k) % SeedCatalog.IMAGE_IDS.size());
                listings.get(i).addImage(SeedCatalog.imageUrl(id), null);
            }
        }
    }

    /** Back-dates listings over the last 60 days so "newest first" ordering looks realistic. */
    private void spreadCreationDates(List<Property> listings, Random random, Instant now) {
        for (Property property : listings) {
            Instant createdAt = now.minus(Duration.ofHours(1 + random.nextInt(24 * 60)));
            jdbc.sql("UPDATE properties SET created_at = :createdAt WHERE id = :id")
                    .param("createdAt", createdAt.atOffset(ZoneOffset.UTC))
                    .param("id", property.getId())
                    .update();
        }
    }

    private void seedPendingVerification(User newOwner, Instant now) {
        byte[] pdf = """
                %PDF-1.4
                1 0 obj << /Type /Catalog >> endobj
                trailer << /Root 1 0 R >>
                %%EOF
                """.getBytes(StandardCharsets.US_ASCII);
        for (DocumentType type : List.of(DocumentType.AADHAAR, DocumentType.PAN)) {
            String key = "private/verification/" + newOwner.getId() + "/" + UUID.randomUUID() + ".pdf";
            storage.store(key, pdf);
            documents.save(new VerificationDocument(newOwner.getId(), type,
                    type.name().toLowerCase(Locale.ROOT) + "-card.pdf", key, "application/pdf", pdf.length));
        }
        newOwner.submitVerification(now.minus(Duration.ofDays(1)));
    }

    private void seedActivity(Seeded seeded) {
        List<Property> listings = seeded.listings();
        Property koramangala = listings.get(0);
        Property hsr = listings.get(5);
        Property indiranagar = listings.get(10);
        User tenant = users.findById(seeded.tenant().getId()).orElseThrow();
        UUID ownerOf0 = koramangala.getOwner().getId();
        UUID ownerOf5 = hsr.getOwner().getId();

        ConversationDto first = chat.start(tenant.getId(), koramangala.getId(),
                "Hi, is this flat still available? I'm looking to move in by next month.");
        chat.send(ownerOf0, first.id(), "Hello Ananya, yes it is available. When would you like to visit?");
        chat.send(tenant.getId(), first.id(), "Could I come this Saturday around 11 AM?");
        ConversationDto second = chat.start(tenant.getId(), hsr.getId(), "Hi! Is car parking included in the rent?");
        chat.send(ownerOf5, second.id(), "Yes, one covered car parking slot is included. Maintenance is separate.");

        LocalDate today = LocalDate.now(clock.withZone(zone));
        Visit requested = visits.save(new Visit(reload(indiranagar), tenant,
                at(today.plusDays(1), LocalTime.of(11, 0)), "I'd like to see the kitchen and balcony."));
        Visit confirmed = new Visit(reload(koramangala), tenant, at(today.plusDays(2), LocalTime.of(17, 30)),
                "Coming with my parents.");
        confirmed.confirm();
        visits.save(confirmed);
        Visit completed = new Visit(reload(hsr), tenant, at(today.minusDays(5), LocalTime.of(10, 30)), null);
        completed.confirm();
        completed.complete(clock.instant());
        visits.save(completed);

        notifications.save(new Notification(requested.getOwner().getId(), NotificationType.VISIT_REQUESTED,
                "New visit request", tenant.getName() + " wants to visit \"" + indiranagar.getTitle() + "\"",
                "/dashboard/visits"));
        notifications.save(new Notification(tenant.getId(), NotificationType.VISIT_CONFIRMED, "Visit confirmed",
                "Your visit to \"" + koramangala.getTitle() + "\" is confirmed", "/dashboard/visits"));
        Notification approved = new Notification(seeded.owner().getId(), NotificationType.VERIFICATION_APPROVED,
                "You're verified!", "Your identity has been verified. Your active listings are now visible to tenants.",
                "/dashboard/verification");
        approved.markRead();
        notifications.save(approved);

        for (Property property : List.of(listings.get(1), listings.get(12), listings.get(20))) {
            shortlists.save(new Shortlist(tenant.getId(), reload(property)));
        }
    }

    private Property reload(Property property) {
        return properties.findLive(property.getId()).orElseThrow();
    }

    private Instant at(LocalDate date, LocalTime time) {
        return date.atTime(time).atZone(zone).toInstant();
    }
}
