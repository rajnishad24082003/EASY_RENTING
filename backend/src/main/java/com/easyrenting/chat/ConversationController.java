package com.easyrenting.chat;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.chat.ChatDtos.ConversationDto;
import com.easyrenting.chat.ChatDtos.MessageDto;
import com.easyrenting.chat.ChatDtos.SendMessageRequest;
import com.easyrenting.chat.ChatDtos.StartConversationRequest;
import com.easyrenting.common.web.CountResponse;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.common.web.Paging;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/v1/conversations")
@Tag(name = "Chat")
public class ConversationController {

    private final ChatService chatService;

    public ConversationController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    @PreAuthorize("hasRole('TENANT')")
    @ResponseStatus(HttpStatus.CREATED)
    public ConversationDto start(@AuthenticationPrincipal AuthenticatedUser tenant,
                                 @Valid @RequestBody StartConversationRequest request) {
        return chatService.start(tenant.id(), request.propertyId(), request.message());
    }

    @GetMapping
    public PageResponse<ConversationDto> list(@AuthenticationPrincipal AuthenticatedUser user,
                                              @RequestParam(required = false) Integer page,
                                              @RequestParam(required = false) Integer size) {
        return chatService.list(user.id(), Paging.of(page, size,
                Sort.by(Sort.Order.desc("lastMessageAt"), Sort.Order.desc("id"))));
    }

    @GetMapping("/unread-count")
    public CountResponse unreadCount(@AuthenticationPrincipal AuthenticatedUser user) {
        return new CountResponse(chatService.unreadCount(user.id()));
    }

    @GetMapping("/{id}")
    public ConversationDto get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id) {
        return chatService.get(user.id(), id);
    }

    @GetMapping("/{id}/messages")
    public List<MessageDto> messages(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id,
                                     @RequestParam(required = false) Instant before,
                                     @RequestParam(required = false) Integer size) {
        return chatService.history(user.id(), id, before, size);
    }

    @PostMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageDto send(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id,
                           @Valid @RequestBody SendMessageRequest request) {
        return chatService.send(user.id(), id, request.content());
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id) {
        chatService.markRead(user.id(), id);
        return ResponseEntity.noContent().build();
    }
}
