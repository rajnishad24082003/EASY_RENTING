package com.easyrenting.storage;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.ApiException;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Duration;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves stored files. {@code public/...} keys are cacheable by anyone; {@code private/verification/{ownerId}/...}
 * keys are only served to that owner or an admin.
 */
@RestController
@RequestMapping("/api/v1/files")
@Tag(name = "Files")
public class FileController {

    private static final String PUBLIC_PREFIX = "public/";
    private static final String PRIVATE_VERIFICATION_PREFIX = "private/verification/";

    private final StorageService storage;

    public FileController(StorageService storage) {
        this.storage = storage;
    }

    @GetMapping("/{*key}")
    public ResponseEntity<Resource> get(@PathVariable String key, @AuthenticationPrincipal AuthenticatedUser user) {
        String normalisedKey = key.startsWith("/") ? key.substring(1) : key;
        CacheControl cacheControl = authorise(normalisedKey, user);
        Resource resource = storage.load(normalisedKey).orElseThrow(() -> ApiException.notFound("File"));
        return ResponseEntity.ok()
                .cacheControl(cacheControl)
                .contentType(mediaType(normalisedKey))
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }

    private static CacheControl authorise(String key, AuthenticatedUser user) {
        if (key.startsWith(PUBLIC_PREFIX)) {
            return CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();
        }
        if (key.startsWith(PRIVATE_VERIFICATION_PREFIX)) {
            if (user == null) {
                throw ApiException.unauthorized("Authentication required");
            }
            if (!user.isAdmin() && !ownerSegment(key).equals(user.id().toString())) {
                throw ApiException.forbidden("You do not have access to this file");
            }
            return CacheControl.noStore().cachePrivate();
        }
        throw ApiException.notFound("File");
    }

    private static String ownerSegment(String key) {
        String rest = key.substring(PRIVATE_VERIFICATION_PREFIX.length());
        int slash = rest.indexOf('/');
        String segment = slash > 0 ? rest.substring(0, slash) : "";
        try {
            return UUID.fromString(segment).toString();
        } catch (IllegalArgumentException ex) {
            return "";
        }
    }

    private static MediaType mediaType(String key) {
        String extension = key.substring(key.lastIndexOf('.') + 1);
        return FileType.fromExtension(extension)
                .map(type -> MediaType.parseMediaType(type.contentType()))
                .orElse(MediaType.APPLICATION_OCTET_STREAM);
    }
}
