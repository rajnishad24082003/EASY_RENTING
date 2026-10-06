package com.easyrenting.chat;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @EntityGraph(attributePaths = {"property", "tenant", "owner"})
    @Query("select c from Conversation c where c.id = :id")
    Optional<Conversation> findDetailed(@Param("id") UUID id);

    @EntityGraph(attributePaths = {"property", "tenant", "owner"})
    Optional<Conversation> findByPropertyIdAndTenantId(UUID propertyId, UUID tenantId);

    @EntityGraph(attributePaths = {"property", "tenant", "owner"})
    @Query(value = "select c from Conversation c where c.tenant.id = :userId or c.owner.id = :userId",
            countQuery = "select count(c) from Conversation c where c.tenant.id = :userId or c.owner.id = :userId")
    Page<Conversation> findForUser(@Param("userId") UUID userId, Pageable pageable);
}
