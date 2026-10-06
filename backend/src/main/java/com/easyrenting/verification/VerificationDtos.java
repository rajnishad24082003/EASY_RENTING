package com.easyrenting.verification;

import com.easyrenting.storage.UploadedFiles;
import com.easyrenting.user.User;
import com.easyrenting.user.VerificationStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class VerificationDtos {

    private VerificationDtos() {
    }

    public record VerificationDocumentDto(UUID id, DocumentType documentType, String fileName, String url,
                                          Instant uploadedAt) {

        public static VerificationDocumentDto from(VerificationDocument d) {
            return new VerificationDocumentDto(d.getId(), d.getDocumentType(), d.getFileName(),
                    UploadedFiles.URL_PREFIX + d.getStorageKey(), d.getCreatedAt());
        }
    }

    public record VerificationDto(VerificationStatus status, Instant submittedAt, Instant reviewedAt,
                                  String rejectionReason, List<VerificationDocumentDto> documents) {

        public static VerificationDto of(User owner, List<VerificationDocument> documents) {
            return new VerificationDto(owner.getVerificationStatus(), owner.getVerificationSubmittedAt(),
                    owner.getVerificationReviewedAt(), owner.getVerificationRejectionReason(),
                    documents.stream().map(VerificationDocumentDto::from).toList());
        }
    }
}
