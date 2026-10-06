package com.easyrenting.property;

import com.easyrenting.common.persistence.BaseEntity;
import com.easyrenting.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * A rental listing. The PostGIS {@code location} column is generated from latitude/longitude by the database and is
 * deliberately not mapped; geo queries go through {@code PropertySearchRepository}.
 */
@Entity
@Table(name = "properties")
public class Property extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false, updatable = false)
    private User owner;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 5000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", nullable = false, length = 32)
    private PropertyType propertyType;

    @Column(nullable = false)
    private int bhk;

    @Column(nullable = false)
    private int bathrooms;

    @Column(name = "area_sqft", nullable = false)
    private int areaSqft;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Furnishing furnishing;

    @Enumerated(EnumType.STRING)
    @Column(name = "tenant_preference", nullable = false, length = 32)
    private TenantPreference tenantPreference;

    @Column(nullable = false)
    private long rent;

    @Column(nullable = false)
    private long deposit;

    @Column(nullable = false)
    private long maintenance;

    @Column(name = "available_from", nullable = false)
    private LocalDate availableFrom;

    private Integer floor;

    @Column(name = "total_floors")
    private Integer totalFloors;

    @Column(length = 32)
    private String facing;

    @Column(name = "address_line", nullable = false)
    private String addressLine;

    @Column(nullable = false, length = 120)
    private String locality;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(nullable = false, length = 80)
    private String state;

    @Column(nullable = false, length = 6)
    private String pincode;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private String[] amenities = new String[0];

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PropertyStatus status;

    @Column(name = "view_count", nullable = false)
    private long viewCount;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Version
    private long version;

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @BatchSize(size = 50)
    private List<PropertyImage> images = new ArrayList<>();

    protected Property() {
    }

    public Property(User owner, PropertyRequest details) {
        this.owner = owner;
        apply(details);
        this.status = details.status() != null ? details.status() : PropertyStatus.ACTIVE;
    }

    public void apply(PropertyRequest d) {
        this.title = d.title().trim();
        this.description = d.description().trim();
        this.propertyType = d.propertyType();
        this.bhk = d.bhk();
        this.bathrooms = d.bathrooms();
        this.areaSqft = d.areaSqft();
        this.furnishing = d.furnishing();
        this.tenantPreference = d.tenantPreference();
        this.rent = d.rent();
        this.deposit = d.deposit();
        this.maintenance = d.maintenance();
        this.availableFrom = d.availableFrom();
        this.floor = d.floor();
        this.totalFloors = d.totalFloors();
        this.facing = d.facing();
        this.addressLine = d.addressLine().trim();
        this.locality = d.locality().trim();
        this.city = d.city().trim();
        this.state = d.state().trim();
        this.pincode = d.pincode();
        this.latitude = d.latitude();
        this.longitude = d.longitude();
        setAmenities(d.amenities());
        if (d.status() != null) {
            this.status = d.status();
        }
    }

    public void changeStatus(PropertyStatus status) {
        this.status = status;
    }

    public void softDelete(Instant now) {
        this.deletedAt = now;
        this.status = PropertyStatus.INACTIVE;
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean isOwnedBy(UUID userId) {
        return owner.getId().equals(userId);
    }

    public PropertyImage addImage(String url, String storageKey) {
        PropertyImage image = new PropertyImage(this, url, storageKey, images.isEmpty(), nextSortOrder());
        images.add(image);
        return image;
    }

    public void removeImage(PropertyImage image) {
        images.remove(image);
        if (image.isCover() && !images.isEmpty()) {
            images.getFirst().markCover(true);
        }
    }

    public void setCover(PropertyImage cover) {
        images.forEach(image -> image.markCover(image.equals(cover)));
    }

    public Optional<PropertyImage> coverImage() {
        return images.stream().filter(PropertyImage::isCover).findFirst()
                .or(() -> images.stream().findFirst());
    }

    private int nextSortOrder() {
        return images.stream().mapToInt(PropertyImage::getSortOrder).max().orElse(-1) + 1;
    }

    private void setAmenities(Collection<Amenity> values) {
        EnumSet<Amenity> set = values == null || values.isEmpty() ? EnumSet.noneOf(Amenity.class) : EnumSet.copyOf(values);
        this.amenities = set.stream().map(Enum::name).toArray(String[]::new);
    }

    public List<Amenity> getAmenities() {
        return Arrays.stream(amenities)
                .map(Amenity::valueOf)
                .sorted(Comparator.naturalOrder())
                .toList();
    }

    public User getOwner() {
        return owner;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public PropertyType getPropertyType() {
        return propertyType;
    }

    public int getBhk() {
        return bhk;
    }

    public int getBathrooms() {
        return bathrooms;
    }

    public int getAreaSqft() {
        return areaSqft;
    }

    public Furnishing getFurnishing() {
        return furnishing;
    }

    public TenantPreference getTenantPreference() {
        return tenantPreference;
    }

    public long getRent() {
        return rent;
    }

    public long getDeposit() {
        return deposit;
    }

    public long getMaintenance() {
        return maintenance;
    }

    public LocalDate getAvailableFrom() {
        return availableFrom;
    }

    public Integer getFloor() {
        return floor;
    }

    public Integer getTotalFloors() {
        return totalFloors;
    }

    public String getFacing() {
        return facing;
    }

    public String getAddressLine() {
        return addressLine;
    }

    public String getLocality() {
        return locality;
    }

    public String getCity() {
        return city;
    }

    public String getState() {
        return state;
    }

    public String getPincode() {
        return pincode;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public PropertyStatus getStatus() {
        return status;
    }

    public long getViewCount() {
        return viewCount;
    }

    public List<PropertyImage> getImages() {
        return List.copyOf(images);
    }
}
