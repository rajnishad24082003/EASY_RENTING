package com.easyrenting.admin;

import com.easyrenting.admin.AdminDtos.AdminStatsDto;
import com.easyrenting.admin.AdminDtos.AdminUserDto;
import com.easyrenting.admin.AdminDtos.AdminVerificationDto;
import com.easyrenting.admin.AdminDtos.RejectVerificationRequest;
import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.common.web.Paging;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.property.PropertyDtos.StatusChangeRequest;
import com.easyrenting.property.PropertyStatus;
import com.easyrenting.user.Role;
import com.easyrenting.user.VerificationStatus;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return adminService.stats();
    }

    @GetMapping("/verifications")
    public PageResponse<AdminVerificationDto> verifications(
            @RequestParam(defaultValue = "PENDING") VerificationStatus status,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return adminService.verifications(status, Paging.of(page, size,
                Sort.by(Sort.Order.asc("verificationSubmittedAt"), Sort.Order.asc("id"))));
    }

    @PostMapping("/verifications/{ownerId}/approve")
    public AdminVerificationDto approve(@PathVariable UUID ownerId) {
        return adminService.approve(ownerId);
    }

    @PostMapping("/verifications/{ownerId}/reject")
    public AdminVerificationDto reject(@PathVariable UUID ownerId,
                                       @Valid @RequestBody RejectVerificationRequest request) {
        return adminService.reject(ownerId, request.reason());
    }

    @GetMapping("/users")
    public PageResponse<AdminUserDto> users(@RequestParam(required = false) String q,
                                            @RequestParam(required = false) Role role,
                                            @RequestParam(required = false) Integer page,
                                            @RequestParam(required = false) Integer size) {
        return adminService.users(q, role, Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @PostMapping("/users/{id}/suspend")
    public AdminUserDto suspend(@AuthenticationPrincipal AuthenticatedUser admin, @PathVariable UUID id) {
        return adminService.suspend(admin, id);
    }

    @PostMapping("/users/{id}/unsuspend")
    public AdminUserDto unsuspend(@PathVariable UUID id) {
        return adminService.unsuspend(id);
    }

    @GetMapping("/properties")
    public PageResponse<PropertySummaryDto> properties(@RequestParam(required = false) String q,
                                                       @RequestParam(required = false) PropertyStatus status,
                                                       @RequestParam(required = false) Integer page,
                                                       @RequestParam(required = false) Integer size) {
        return adminService.properties(q, status, Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @PatchMapping("/properties/{id}/status")
    public PropertySummaryDto changePropertyStatus(@AuthenticationPrincipal AuthenticatedUser admin,
                                                   @PathVariable UUID id,
                                                   @Valid @RequestBody StatusChangeRequest request) {
        return adminService.changePropertyStatus(admin, id, request.status());
    }
}
