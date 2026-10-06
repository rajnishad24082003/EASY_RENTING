package com.easyrenting.shortlist;

import com.easyrenting.property.PropertyVisibility;
import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShortlistRepository extends JpaRepository<Shortlist, UUID> {

    boolean existsByTenantIdAndPropertyId(UUID tenantId, UUID propertyId);

    @Modifying
    @Query("delete from Shortlist s where s.tenantId = :tenantId and s.property.id = :propertyId")
    int deleteByTenantAndProperty(@Param("tenantId") UUID tenantId, @Param("propertyId") UUID propertyId);

    @Query("select s.property.id from Shortlist s where s.tenantId = :tenantId and s.property.id in :propertyIds")
    Set<UUID> findShortlistedIds(@Param("tenantId") UUID tenantId,
                                 @Param("propertyIds") Collection<UUID> propertyIds);

    @Query(value = "select s from Shortlist s join fetch s.property p join fetch p.owner"
            + " where s.tenantId = :tenantId and " + PropertyVisibility.JPQL,
            countQuery = "select count(s) from Shortlist s join s.property p"
                    + " where s.tenantId = :tenantId and " + PropertyVisibility.JPQL)
    Page<Shortlist> findVisibleByTenant(@Param("tenantId") UUID tenantId, Pageable pageable);
}
