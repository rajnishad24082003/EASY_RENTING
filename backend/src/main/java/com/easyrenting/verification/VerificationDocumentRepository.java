package com.easyrenting.verification;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VerificationDocumentRepository extends JpaRepository<VerificationDocument, UUID> {

    List<VerificationDocument> findByOwnerIdOrderByCreatedAtAsc(UUID ownerId);

    List<VerificationDocument> findByOwnerIdInOrderByCreatedAtAsc(Collection<UUID> ownerIds);

    Optional<VerificationDocument> findByIdAndOwnerId(UUID id, UUID ownerId);

    boolean existsByOwnerIdAndDocumentTypeIn(UUID ownerId, Collection<DocumentType> types);
}
