package com.easyrenting.verification;

import com.easyrenting.common.ApiException;
import com.easyrenting.notification.NotificationService;
import com.easyrenting.notification.NotificationType;
import com.easyrenting.storage.FileType;
import com.easyrenting.storage.UploadedFiles;
import com.easyrenting.storage.UploadedFiles.StoredFile;
import com.easyrenting.user.Role;
import com.easyrenting.user.User;
import com.easyrenting.user.UserService;
import com.easyrenting.user.VerificationStatus;
import com.easyrenting.verification.VerificationDtos.VerificationDocumentDto;
import com.easyrenting.verification.VerificationDtos.VerificationDto;
import java.time.Clock;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

/** Owner KYC workflow (contract rule 6): upload documents → submit (PENDING) → admin approves or rejects. */
@Service
public class VerificationService {

    private static final Set<FileType> DOCUMENT_TYPES = Set.of(FileType.PDF, FileType.JPEG, FileType.PNG);
    private static final String VERIFICATION_LINK = "/dashboard/verification";

    private final VerificationDocumentRepository documents;
    private final UserService users;
    private final UploadedFiles uploads;
    private final NotificationService notifications;
    private final Clock clock;

    public VerificationService(VerificationDocumentRepository documents, UserService users, UploadedFiles uploads,
                               NotificationService notifications, Clock clock) {
        this.documents = documents;
        this.users = users;
        this.uploads = uploads;
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public VerificationDto get(UUID ownerId) {
        return VerificationDto.of(users.require(ownerId), documents.findByOwnerIdOrderByCreatedAtAsc(ownerId));
    }

    /** Batch variant for admin listings. */
    @Transactional(readOnly = true)
    public Map<UUID, List<VerificationDocument>> documentsByOwner(Collection<UUID> ownerIds) {
        return documents.findByOwnerIdInOrderByCreatedAtAsc(ownerIds).stream()
                .collect(Collectors.groupingBy(VerificationDocument::getOwnerId));
    }

    @Transactional
    public VerificationDocumentDto upload(UUID ownerId, MultipartFile file, DocumentType type) {
        User owner = users.require(ownerId);
        requireEditable(owner);
        StoredFile stored = uploads.store(file, "private/verification/" + ownerId, DOCUMENT_TYPES);
        deleteOnRollback(stored.key());
        VerificationDocument document = documents.save(new VerificationDocument(ownerId, type,
                UploadedFiles.safeFileName(file.getOriginalFilename()), stored.key(), stored.type().contentType(),
                stored.size()));
        return VerificationDocumentDto.from(document);
    }

    @Transactional
    public void deleteDocument(UUID ownerId, UUID documentId) {
        requireEditable(users.require(ownerId));
        VerificationDocument document = documents.findByIdAndOwnerId(documentId, ownerId)
                .orElseThrow(() -> ApiException.notFound("Document"));
        documents.delete(document);
        String key = document.getStorageKey();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                uploads.delete(key);
            }
        });
    }

    @Transactional
    public VerificationDto submit(UUID ownerId) {
        User owner = users.require(ownerId);
        if (owner.getVerificationStatus() == VerificationStatus.PENDING) {
            throw ApiException.conflict("Verification is already pending review");
        }
        if (owner.getVerificationStatus() == VerificationStatus.VERIFIED) {
            throw ApiException.conflict("Account is already verified");
        }
        if (!documents.existsByOwnerIdAndDocumentTypeIn(ownerId, DocumentType.IDENTITY)) {
            throw ApiException.badRequest("Upload at least one identity document (Aadhaar, PAN, passport or driving licence)");
        }
        owner.submitVerification(clock.instant());
        return VerificationDto.of(owner, documents.findByOwnerIdOrderByCreatedAtAsc(ownerId));
    }

    @Transactional
    public User approve(UUID ownerId) {
        User owner = requirePendingOwner(ownerId);
        owner.approveVerification(clock.instant());
        notifications.notify(ownerId, NotificationType.VERIFICATION_APPROVED, "You're verified!",
                "Your identity has been verified. Your active listings are now visible to tenants.", VERIFICATION_LINK);
        return owner;
    }

    @Transactional
    public User reject(UUID ownerId, String reason) {
        User owner = requirePendingOwner(ownerId);
        owner.rejectVerification(reason.trim(), clock.instant());
        notifications.notify(ownerId, NotificationType.VERIFICATION_REJECTED, "Verification rejected",
                "Your verification was rejected: " + reason.trim() + ". Please update your documents and resubmit.",
                VERIFICATION_LINK);
        return owner;
    }

    private User requirePendingOwner(UUID ownerId) {
        User owner = users.require(ownerId);
        if (owner.getRole() != Role.OWNER) {
            throw ApiException.notFound("Owner");
        }
        if (owner.getVerificationStatus() != VerificationStatus.PENDING) {
            throw ApiException.conflict("Only pending verifications can be reviewed");
        }
        return owner;
    }

    private static void requireEditable(User owner) {
        if (owner.getVerificationStatus() == VerificationStatus.PENDING) {
            throw ApiException.conflict("Documents cannot be changed while verification is pending review");
        }
    }

    private void deleteOnRollback(String key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    uploads.delete(key);
                }
            }
        });
    }
}
