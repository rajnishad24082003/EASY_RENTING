package com.easyrenting.property;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.common.web.Paging;
import com.easyrenting.property.PropertyDtos.PropertyDetailDto;
import com.easyrenting.property.PropertyDtos.PropertyImageDto;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.property.PropertyDtos.StatusChangeRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/properties")
@Tag(name = "Properties")
public class PropertyController {

    private final PropertyService propertyService;
    private final PropertyImageService imageService;

    public PropertyController(PropertyService propertyService, PropertyImageService imageService) {
        this.propertyService = propertyService;
        this.imageService = imageService;
    }

    @GetMapping("/{id}")
    public PropertyDetailDto get(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser viewer) {
        return propertyService.detail(id, viewer);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('OWNER')")
    public PageResponse<PropertySummaryDto> mine(@AuthenticationPrincipal AuthenticatedUser owner,
                                                 @RequestParam(required = false) Integer page,
                                                 @RequestParam(required = false) Integer size) {
        return propertyService.mine(owner, Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    @ResponseStatus(HttpStatus.CREATED)
    public PropertyDetailDto create(@AuthenticationPrincipal AuthenticatedUser owner,
                                    @Valid @RequestBody PropertyRequest request) {
        return propertyService.create(owner, request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public PropertyDetailDto update(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable UUID id,
                                    @Valid @RequestBody PropertyRequest request) {
        return propertyService.update(actor, id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public PropertyDetailDto changeStatus(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable UUID id,
                                          @Valid @RequestBody StatusChangeRequest request) {
        return propertyService.changeStatus(actor, id, request.status());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER', 'ADMIN')")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable UUID id) {
        propertyService.delete(actor, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(path = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('OWNER')")
    public List<PropertyImageDto> uploadImages(
            @AuthenticationPrincipal AuthenticatedUser owner,
            @PathVariable UUID id,
            @RequestPart(name = "files", required = false) List<MultipartFile> files,
            @RequestPart(name = "files[]", required = false) List<MultipartFile> bracketedFiles) {
        // Browsers and HTTP clients disagree on "files" vs "files[]" for repeated parts; accept both.
        List<MultipartFile> all = new ArrayList<>();
        if (files != null) {
            all.addAll(files);
        }
        if (bracketedFiles != null) {
            all.addAll(bracketedFiles);
        }
        return imageService.upload(owner, id, all);
    }

    @DeleteMapping("/{id}/images/{imageId}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Void> deleteImage(@AuthenticationPrincipal AuthenticatedUser owner,
                                            @PathVariable UUID id, @PathVariable UUID imageId) {
        imageService.delete(owner, id, imageId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/images/{imageId}/cover")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<Void> setCover(@AuthenticationPrincipal AuthenticatedUser owner,
                                         @PathVariable UUID id, @PathVariable UUID imageId) {
        imageService.setCover(owner, id, imageId);
        return ResponseEntity.noContent().build();
    }
}
