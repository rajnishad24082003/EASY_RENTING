package com.easyrenting.search;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Built-in gazetteer of well-known Indian rental localities (bundled JSON), used to geocode locality names in
 * search queries and for autocomplete.
 */
@Component
public class LocalityGazetteer {

    public record Locality(String name, String city, String state, double latitude, double longitude) {
    }

    private record CityEntry(String name, String state, List<String> aliases, List<LocalityEntry> localities) {
    }

    private record LocalityEntry(String name, double latitude, double longitude, List<String> aliases) {
    }

    private record GazetteerFile(List<CityEntry> cities) {
    }

    private static final String RESOURCE = "gazetteer/localities.json";

    private final List<Locality> localities = new ArrayList<>();
    /** Normalised alias → locality, longest alias first so "hsr layout" wins over shorter overlaps. */
    private final Map<String, Locality> localityAliases;
    private final Map<String, String> cityAliases;

    public LocalityGazetteer() {
        GazetteerFile file = read();
        Map<String, Locality> aliases = new LinkedHashMap<>();
        Map<String, String> cities = new LinkedHashMap<>();
        for (CityEntry city : file.cities()) {
            cities.put(normalise(city.name()), city.name());
            city.aliases().forEach(alias -> cities.put(normalise(alias), city.name()));
            for (LocalityEntry entry : city.localities()) {
                Locality locality = new Locality(entry.name(), city.name(), city.state(), entry.latitude(),
                        entry.longitude());
                localities.add(locality);
                aliases.put(normalise(entry.name()), locality);
                entry.aliases().forEach(alias -> aliases.put(normalise(alias), locality));
            }
        }
        this.localityAliases = sortedByLengthDesc(aliases);
        this.cityAliases = sortedByLengthDesc(cities);
    }

    public List<Locality> all() {
        return List.copyOf(localities);
    }

    public Optional<Locality> find(String name) {
        return name == null ? Optional.empty() : Optional.ofNullable(localityAliases.get(normalise(name)));
    }

    /** Finds a locality by name, preferring one in the given city when names collide. */
    public Optional<Locality> find(String name, String city) {
        Optional<Locality> match = find(name);
        if (match.isPresent() && city != null && !match.get().city().equalsIgnoreCase(canonicalCity(city).orElse(city))) {
            return Optional.empty();
        }
        return match;
    }

    public Optional<String> canonicalCity(String name) {
        return name == null ? Optional.empty() : Optional.ofNullable(cityAliases.get(normalise(name)));
    }

    /** Returns the longest locality alias mentioned as whole words in free text. */
    public Optional<Locality> findLocalityIn(String text) {
        String haystack = " " + normalise(text) + " ";
        return localityAliases.entrySet().stream()
                .filter(e -> haystack.contains(" " + e.getKey() + " "))
                .map(Map.Entry::getValue)
                .findFirst();
    }

    /** Returns the canonical city mentioned as whole words in free text. */
    public Optional<String> findCityIn(String text) {
        String haystack = " " + normalise(text) + " ";
        return cityAliases.entrySet().stream()
                .filter(e -> haystack.contains(" " + e.getKey() + " "))
                .map(Map.Entry::getValue)
                .findFirst();
    }

    public List<Locality> autocomplete(String query, int limit) {
        String q = normalise(query);
        if (q.isEmpty()) {
            return List.of();
        }
        return localities.stream()
                .filter(l -> normalise(l.name()).startsWith(q) || normalise(l.name()).contains(" " + q))
                .sorted(Comparator.comparing(Locality::name))
                .limit(limit)
                .toList();
    }

    public static String normalise(String text) {
        if (text == null) {
            return "";
        }
        return text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    private static <V> Map<String, V> sortedByLengthDesc(Map<String, V> source) {
        Map<String, V> sorted = new LinkedHashMap<>();
        source.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<String, V> e) -> e.getKey().length()).reversed())
                .forEach(e -> sorted.put(e.getKey(), e.getValue()));
        return sorted;
    }

    private static GazetteerFile read() {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            return JsonMapper.builder().build().readValue(in, GazetteerFile.class);
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot load " + RESOURCE, ex);
        }
    }
}
