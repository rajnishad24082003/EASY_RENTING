package com.easyrenting.search;

import java.util.UUID;

public final class SearchDtos {

    private SearchDtos() {
    }

    public record MapPinDto(UUID id, double latitude, double longitude, long rent, int bhk, String title) {
    }

    public record LocalityDto(String name, String city, double latitude, double longitude) {
    }
}
