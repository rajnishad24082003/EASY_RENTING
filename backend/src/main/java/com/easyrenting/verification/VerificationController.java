package com.easyrenting.verification;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.verification.VerificationDtos.VerificationDocumentDto;
import com.easyrenting.verification.VerificationDtos.VerificationDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/verification")
@PreAuthorize("hasRole('OWNER')")
@Tag(name = "Owner verification")
public class VerificationController {

    private final VerificationService verificationService;

    public VerificationController(VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @GetMapping
    public VerificationDto get(@AuthenticationPrincipal AuthenticatedUser owner) {
        return verificationService.get(owner.id());
    }

    @PostMapping(path = "/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public VerificationDocumentDto upload(@AuthenticationPrincipal AuthenticatedUser owner,
                                          @RequestPart("file") MultipartFile file,
                                          @RequestParam("documentType") DocumentType documentType) {
        return verificationService.upload(owner.id(), file, documentType);
    }

    @DeleteMapping("/documents/{docId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser owner, @PathVariable UUID docId) {
        verificationService.deleteDocument(owner.id(), docId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/submit")
    public VerificationDto submit(@AuthenticationPrincipal AuthenticatedUser owner) {
        return verificationService.submit(owner.id());
    }
}
