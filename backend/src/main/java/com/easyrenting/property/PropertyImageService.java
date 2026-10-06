package com.easyrenting.property;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.ApiException;
import com.easyrenting.property.PropertyDtos.PropertyImageDto;
import com.easyrenting.storage.FileType;
import com.easyrenting.storage.UploadedFiles;
import com.easyrenting.storage.UploadedFiles.StoredFile;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PropertyImageService {

    static final int MAX_IMAGES_PER_LISTING = 15;
    private static final Set<FileType> IMAGE_TYPES = Set.of(FileType.JPEG, FileType.PNG, FileType.WEBP);

    private final PropertyRepository properties;
    private final UploadedFiles uploads;

    public PropertyImageService(PropertyRepository properties, UploadedFiles uploads) {
        this.properties = properties;
        this.uploads = uploads;
    }

    /** Stores the uploaded images and returns the listing's full, ordered image list. */
    @Transactional
    public List<PropertyImageDto> upload(AuthenticatedUser owner, UUID propertyId, List<MultipartFile> files) {
        Property property = requireOwned(owner, propertyId);
        if (files == null || files.isEmpty()) {
            throw ApiException.badRequest("At least one file is required");
        }
        if (property.getImages().size() + files.size() > MAX_IMAGES_PER_LISTING) {
            throw ApiException.badRequest("A listing can have at most " + MAX_IMAGES_PER_LISTING + " images");
        }
        List<String> storedKeys = new ArrayList<>();
        deleteOnRollback(storedKeys);
        for (MultipartFile file : files) {
            StoredFile stored = uploads.store(file, "public/properties/" + propertyId, IMAGE_TYPES);
            storedKeys.add(stored.key());
            property.addImage(stored.url(), stored.key());
        }
        properties.flush();
        return property.getImages().stream().map(PropertyMapper::toImage).toList();
    }

    @Transactional
    public void delete(AuthenticatedUser owner, UUID propertyId, UUID imageId) {
        Property property = requireOwned(owner, propertyId);
        PropertyImage image = findImage(property, imageId);
        property.removeImage(image);
        String key = image.getStorageKey();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                uploads.delete(key);
            }
        });
    }

    @Transactional
    public void setCover(AuthenticatedUser owner, UUID propertyId, UUID imageId) {
        Property property = requireOwned(owner, propertyId);
        property.setCover(findImage(property, imageId));
    }

    private Property requireOwned(AuthenticatedUser owner, UUID propertyId) {
        Property property = properties.findLive(propertyId).orElseThrow(() -> ApiException.notFound("Property"));
        if (!property.isOwnedBy(owner.id())) {
            throw ApiException.forbidden("Only the listing owner can manage its images");
        }
        return property;
    }

    private static PropertyImage findImage(Property property, UUID imageId) {
        return property.getImages().stream()
                .filter(image -> image.getId().equals(imageId))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("Image"));
    }

    private void deleteOnRollback(List<String> keys) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    keys.forEach(uploads::delete);
                }
            }
        });
    }
}
