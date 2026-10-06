package com.easyrenting.seed;

import java.util.List;

/** Static reference data for the demo seed: localities with realistic rents, landmarks and societies. */
final class SeedCatalog {

    private SeedCatalog() {
    }

    record SeedLocality(String name, String city, String state, String pincode, double latitude, double longitude,
                        long oneBhkRent, int depositMonths, int listings, List<String> landmarks,
                        List<String> societies) {
    }

    static final List<SeedLocality> LOCALITIES = List.of(
            new SeedLocality("Koramangala", "Bengaluru", "Karnataka", "560034", 12.9352, 77.6245, 24_000, 6, 5,
                    List.of("Sony World Signal", "Forum Mall", "80 Feet Road", "Jyoti Nivas College"),
                    List.of("Raheja Residency", "Salarpuria Splendour", "Mantri Paradise", "Prestige Acropolis")),
            new SeedLocality("HSR Layout", "Bengaluru", "Karnataka", "560102", 12.9116, 77.6474, 22_000, 6, 5,
                    List.of("27th Main Road", "Agara Lake", "BDA Complex", "Sector 2 Park"),
                    List.of("Shubh Enclave", "Brigade Palmgrove", "Mantri Classic", "Purva Fairmont")),
            new SeedLocality("Indiranagar", "Bengaluru", "Karnataka", "560038", 12.9784, 77.6408, 26_000, 6, 5,
                    List.of("100 Feet Road", "12th Main", "Indiranagar Metro Station", "CMH Road"),
                    List.of("Prestige Infantry Court", "Sobha Garnet", "HAL 2nd Stage Villas", "Defence Colony")),
            new SeedLocality("Whitefield", "Bengaluru", "Karnataka", "560066", 12.9698, 77.7500, 18_000, 6, 5,
                    List.of("ITPL Main Road", "Phoenix Marketcity", "Hope Farm Junction", "Kundalahalli Gate"),
                    List.of("Prestige Shantiniketan", "Brigade Lakefront", "Sobha Dream Acres", "Purva Panorama")),
            new SeedLocality("Marathahalli", "Bengaluru", "Karnataka", "560037", 12.9569, 77.7011, 16_000, 6, 5,
                    List.of("Outer Ring Road", "Marathahalli Bridge", "Innovative Multiplex", "Spice Garden"),
                    List.of("Salarpuria Gold Summit", "Sobha Silicon Oasis", "Brigade Metropolis", "Purva Riviera")),
            new SeedLocality("BTM Layout", "Bengaluru", "Karnataka", "560076", 12.9166, 77.6101, 15_000, 6, 5,
                    List.of("Udupi Garden Signal", "Silk Board Junction", "BTM Lake", "16th Main"),
                    List.of("Sobha Rose", "Mantri Elegance", "Ozone Residenza", "Shriram Spandana")),
            new SeedLocality("Electronic City", "Bengaluru", "Karnataka", "560100", 12.8452, 77.6602, 12_000, 6, 5,
                    List.of("Infosys Gate 1", "Neeladri Road", "Wipro Gate", "Hosur Road"),
                    List.of("Ajmera Infinity", "Shriram Smrithi", "Concorde Silicon Valley", "Purva Venezia")),
            new SeedLocality("Bellandur", "Bengaluru", "Karnataka", "560103", 12.9304, 77.6784, 19_000, 6, 5,
                    List.of("Ecospace", "RMZ Ecoworld", "Bellandur Lake", "Central Mall"),
                    List.of("Adarsh Palm Retreat", "Sobha Iris", "Prestige Lakeside Habitat", "Salarpuria Greenage")),
            new SeedLocality("Andheri", "Mumbai", "Maharashtra", "400053", 19.1197, 72.8464, 35_000, 4, 4,
                    List.of("Lokhandwala Complex", "Andheri Metro Station", "Versova Link Road", "Infinity Mall"),
                    List.of("Oberoi Springs", "Raheja Classique", "Lokhandwala Riviera", "Kalpataru Pinnacle")),
            new SeedLocality("Powai", "Mumbai", "Maharashtra", "400076", 19.1176, 72.9060, 40_000, 4, 4,
                    List.of("Hiranandani Gardens", "IIT Bombay Main Gate", "Powai Lake", "Galleria Mall"),
                    List.of("Hiranandani Glen Ridge", "Lake Homes", "Kensington", "Avalon")),
            new SeedLocality("Bandra", "Mumbai", "Maharashtra", "400050", 19.0596, 72.8295, 55_000, 4, 4,
                    List.of("Carter Road", "Hill Road", "Linking Road", "Bandstand Promenade"),
                    List.of("Sea Breeze Apartments", "Pali Hill Residency", "Rizvi Park", "Kalpataru Sparkle")),
            new SeedLocality("Hinjewadi", "Pune", "Maharashtra", "411057", 18.5913, 73.7389, 14_000, 3, 3,
                    List.of("Rajiv Gandhi Infotech Park Phase 1", "Shivaji Chowk", "Wakad Bridge", "Hinjewadi Phase 2"),
                    List.of("Megapolis Sunway", "Blue Ridge", "Kolte Patil Life Republic", "Xrbia Hinjewadi")),
            new SeedLocality("Baner", "Pune", "Maharashtra", "411045", 18.5590, 73.7868, 17_000, 3, 3,
                    List.of("Baner Road", "Balewadi High Street", "Sus Road", "Baner Hill"),
                    List.of("Pristine Prolife", "Rohan Abhilasha", "Kalpataru Jade Residences", "Sai Paradise")),
            new SeedLocality("Kharadi", "Pune", "Maharashtra", "411014", 18.5515, 73.9348, 16_000, 3, 3,
                    List.of("EON IT Park", "World Trade Center", "Kharadi Bypass", "Zensar Tech Park"),
                    List.of("Gera World of Joy", "Panchshil Towers", "Marvel Isola", "Kolte Patil Downtown")));

    /** Curated Unsplash photos of apartments and interiors. */
    static final List<String> IMAGE_IDS = List.of(
            "photo-1502672260266-1c1ef2d93688", "photo-1522708323590-d24dbb6b0267", "photo-1560448204-e02f11c3d0e2",
            "photo-1493809842364-78817add7ffb", "photo-1484154218962-a197022b5858", "photo-1505691938895-1758d7feb511",
            "photo-1560185007-cde436f6a4d0", "photo-1560448075-bb485b067938", "photo-1556911220-bff31c812dba",
            "photo-1574362848149-11496d93a7c7", "photo-1600596542815-ffad4c1539a9", "photo-1600585154340-be6161a56a0c",
            "photo-1600607687939-ce8a6c25118c", "photo-1600566753190-17f0baa2a6c3", "photo-1512917774080-9991f1c4c750",
            "photo-1564013799919-ab600027ffc6", "photo-1570129477492-45c003edd2be", "photo-1586023492125-27b2c045efd7",
            "photo-1595526114035-0d45ed16cfbf", "photo-1554995207-c18c203602cb");

    static String imageUrl(String id) {
        return "https://images.unsplash.com/" + id + "?w=1200&q=80";
    }

    static final List<String> FACINGS = List.of("East", "North", "North-East", "West", "South", "South-East");

    static final List<String> HIGHLIGHTS = List.of(
            "plenty of natural light and cross ventilation",
            "a modular kitchen with chimney and ample storage",
            "a large balcony overlooking the society garden",
            "vitrified tile flooring and fresh paint",
            "wardrobes in every bedroom and a utility area",
            "24x7 water supply from borewell and Cauvery/municipal connection",
            "covered car parking and visitor parking",
            "a quiet, tree-lined lane yet minutes from the main road");

    static final List<String> HOUSE_RULES = List.of(
            "Owner stays nearby and is responsive for maintenance requests.",
            "No brokerage — deal directly with the owner.",
            "Society allows move-in on weekends with prior intimation.",
            "Rent agreement for 11 months, renewable.",
            "Police verification is mandatory before move-in.");
}
