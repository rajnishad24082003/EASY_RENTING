package com.easyrenting.visit;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.visit.VisitDtos.CreateVisitRequest;
import com.easyrenting.visit.VisitDtos.ReasonRequest;
import com.easyrenting.visit.VisitDtos.RescheduleRequest;
import com.easyrenting.visit.VisitDtos.VisitDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/visits")
@Tag(name = "Visits")
public class VisitController {

    private final VisitService visitService;

    public VisitController(VisitService visitService) {
        this.visitService = visitService;
    }

    @PostMapping
    @PreAuthorize("hasRole('TENANT')")
    @ResponseStatus(HttpStatus.CREATED)
    public VisitDto request(@AuthenticationPrincipal AuthenticatedUser tenant,
                            @Valid @RequestBody CreateVisitRequest request) {
        return visitService.request(tenant, request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TENANT', 'OWNER')")
    public PageResponse<VisitDto> list(@AuthenticationPrincipal AuthenticatedUser user,
                                       @RequestParam(name = "status", required = false) List<VisitStatus> statuses,
                                       @RequestParam(required = false) Boolean upcoming,
                                       @RequestParam(required = false) Integer page,
                                       @RequestParam(required = false) Integer size) {
        return visitService.list(user, statuses, upcoming, page, size);
    }

    @GetMapping("/{id}")
    public VisitDto get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id) {
        return visitService.get(user, id);
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasRole('OWNER')")
    public VisitDto confirm(@AuthenticationPrincipal AuthenticatedUser owner, @PathVariable UUID id) {
        return visitService.confirm(owner, id);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('OWNER')")
    public VisitDto reject(@AuthenticationPrincipal AuthenticatedUser owner, @PathVariable UUID id,
                           @Valid @RequestBody(required = false) ReasonRequest body) {
        return visitService.reject(owner, id, body == null ? null : body.reason());
    }

    @PostMapping("/{id}/reschedule")
    @PreAuthorize("hasRole('OWNER')")
    public VisitDto reschedule(@AuthenticationPrincipal AuthenticatedUser owner, @PathVariable UUID id,
                               @Valid @RequestBody RescheduleRequest body) {
        return visitService.reschedule(owner, id, body.proposedAt(), body.note());
    }

    @PostMapping("/{id}/accept-reschedule")
    @PreAuthorize("hasRole('TENANT')")
    public VisitDto acceptReschedule(@AuthenticationPrincipal AuthenticatedUser tenant, @PathVariable UUID id) {
        return visitService.acceptReschedule(tenant, id);
    }

    @PostMapping("/{id}/cancel")
    public VisitDto cancel(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id,
                           @Valid @RequestBody(required = false) ReasonRequest body) {
        return visitService.cancel(user, id, body == null ? null : body.reason());
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasRole('OWNER')")
    public VisitDto complete(@AuthenticationPrincipal AuthenticatedUser owner, @PathVariable UUID id) {
        return visitService.complete(owner, id);
    }
}
