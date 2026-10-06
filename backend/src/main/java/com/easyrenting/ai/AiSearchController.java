package com.easyrenting.ai;

import com.easyrenting.ai.AiSearchDtos.AiSearchRequest;
import com.easyrenting.ai.AiSearchDtos.AiSearchResponse;
import com.easyrenting.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Search")
public class AiSearchController {

    private final AiSearchService aiSearchService;

    public AiSearchController(AiSearchService aiSearchService) {
        this.aiSearchService = aiSearchService;
    }

    @PostMapping("/ai")
    @Operation(summary = "Natural-language search", description = "Rate limited to 20 requests/minute per IP.")
    public AiSearchResponse search(@Valid @RequestBody AiSearchRequest request,
                                   @AuthenticationPrincipal AuthenticatedUser viewer) {
        return aiSearchService.search(request, viewer);
    }
}
