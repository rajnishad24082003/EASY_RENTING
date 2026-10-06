package com.easyrenting.shortlist;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.common.web.Paging;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/shortlist")
@PreAuthorize("hasRole('TENANT')")
@Tag(name = "Shortlist")
public class ShortlistController {

    private final ShortlistService shortlistService;

    public ShortlistController(ShortlistService shortlistService) {
        this.shortlistService = shortlistService;
    }

    @GetMapping
    public PageResponse<PropertySummaryDto> list(@AuthenticationPrincipal AuthenticatedUser tenant,
                                                 @RequestParam(required = false) Integer page,
                                                 @RequestParam(required = false) Integer size) {
        return shortlistService.list(tenant.id(), Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @PutMapping("/{propertyId}")
    public ResponseEntity<Void> add(@AuthenticationPrincipal AuthenticatedUser tenant, @PathVariable UUID propertyId) {
        shortlistService.add(tenant.id(), propertyId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{propertyId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal AuthenticatedUser tenant,
                                       @PathVariable UUID propertyId) {
        shortlistService.remove(tenant.id(), propertyId);
        return ResponseEntity.noContent().build();
    }
}
