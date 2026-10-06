package com.easyrenting.property;

import com.easyrenting.property.PropertyDtos.OwnerSummaryDto;
import com.easyrenting.property.PropertyDtos.PropertyDetailDto;
import com.easyrenting.property.PropertyDtos.PropertyImageDto;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.user.User;

public final class PropertyMapper {

    private PropertyMapper() {
    }

    public static PropertySummaryDto toSummary(Property p, boolean shortlisted) {
        return new PropertySummaryDto(p.getId(), p.getTitle(), p.getPropertyType(), p.getBhk(), p.getBathrooms(),
                p.getAreaSqft(), p.getFurnishing(), p.getTenantPreference(), p.getRent(), p.getDeposit(),
                p.getLocality(), p.getCity(), p.getLatitude(), p.getLongitude(), coverUrl(p), p.getAmenities(),
                p.getStatus(), p.getAvailableFrom(), p.getCreatedAt(), null, p.getOwner().isVerified(), shortlisted);
    }

    public static PropertyDetailDto toDetail(Property p, boolean shortlisted) {
        User owner = p.getOwner();
        return new PropertyDetailDto(p.getId(), p.getTitle(), p.getPropertyType(), p.getBhk(), p.getBathrooms(),
                p.getAreaSqft(), p.getFurnishing(), p.getTenantPreference(), p.getRent(), p.getDeposit(),
                p.getLocality(), p.getCity(), p.getLatitude(), p.getLongitude(), coverUrl(p), p.getAmenities(),
                p.getStatus(), p.getAvailableFrom(), p.getCreatedAt(), null, owner.isVerified(), shortlisted,
                p.getDescription(), p.getMaintenance(), p.getFloor(), p.getTotalFloors(), p.getFacing(),
                p.getAddressLine(), p.getState(), p.getPincode(),
                p.getImages().stream().map(PropertyMapper::toImage).toList(),
                new OwnerSummaryDto(owner.getId(), owner.getName(), owner.isVerified(), owner.getCreatedAt()),
                p.getViewCount(), p.getUpdatedAt());
    }

    public static PropertyImageDto toImage(PropertyImage image) {
        return new PropertyImageDto(image.getId(), image.getUrl(), image.isCover(), image.getSortOrder());
    }

    public static String coverUrl(Property property) {
        return property.coverImage().map(PropertyImage::getUrl).orElse(null);
    }
}
