package com.easyrenting.visit;

import java.time.Instant;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VisitRepository extends JpaRepository<Visit, UUID>, JpaSpecificationExecutor<Visit> {

    @EntityGraph(attributePaths = {"property", "tenant", "owner"})
    @Query("select v from Visit v where v.id = :id")
    Optional<Visit> findDetailed(@Param("id") UUID id);

    @Override
    @EntityGraph(attributePaths = {"property", "tenant", "owner"})
    Page<Visit> findAll(Specification<Visit> spec, Pageable pageable);

    boolean existsByTenantIdAndPropertyIdAndStatusIn(UUID tenantId, UUID propertyId, Collection<VisitStatus> statuses);

    long countByCreatedAtAfter(Instant since);
}
