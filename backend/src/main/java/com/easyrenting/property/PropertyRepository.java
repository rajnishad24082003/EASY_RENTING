package com.easyrenting.property;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PropertyRepository extends JpaRepository<Property, UUID> {

    @EntityGraph(attributePaths = "owner")
    @Query("select p from Property p where p.id = :id and p.deletedAt is null")
    Optional<Property> findLive(@Param("id") UUID id);

    @EntityGraph(attributePaths = "owner")
    @Query("select p from Property p where p.id = :id and " + PropertyVisibility.JPQL)
    Optional<Property> findPublic(@Param("id") UUID id);

    @EntityGraph(attributePaths = "owner")
    @Query(value = "select p from Property p where p.owner.id = :ownerId and p.deletedAt is null",
            countQuery = "select count(p) from Property p where p.owner.id = :ownerId and p.deletedAt is null")
    Page<Property> findByOwner(@Param("ownerId") UUID ownerId, Pageable pageable);

    @EntityGraph(attributePaths = "owner")
    @Query(value = """
            select p from Property p
            where p.deletedAt is null
              and (:status is null or p.status = :status)
              and (:q is null
                   or lower(p.title) like lower(concat('%', cast(:q as string), '%'))
                   or lower(p.locality) like lower(concat('%', cast(:q as string), '%'))
                   or lower(p.city) like lower(concat('%', cast(:q as string), '%')))
            """,
            countQuery = """
            select count(p) from Property p
            where p.deletedAt is null
              and (:status is null or p.status = :status)
              and (:q is null
                   or lower(p.title) like lower(concat('%', cast(:q as string), '%'))
                   or lower(p.locality) like lower(concat('%', cast(:q as string), '%'))
                   or lower(p.city) like lower(concat('%', cast(:q as string), '%')))
            """)
    Page<Property> adminSearch(@Param("q") String q, @Param("status") PropertyStatus status, Pageable pageable);

    interface OwnerListingCount {
        UUID getOwnerId();

        long getCount();
    }

    @Query("""
            select p.owner.id as ownerId, count(p) as count from Property p
            where p.owner.id in :ownerIds and p.deletedAt is null
            group by p.owner.id
            """)
    List<OwnerListingCount> countByOwners(@Param("ownerIds") Collection<UUID> ownerIds);

    @Query("select count(p) from Property p where " + PropertyVisibility.JPQL)
    long countPublic();

    long countByDeletedAtIsNull();

    @Modifying
    @Query("update Property p set p.viewCount = p.viewCount + 1 where p.id = :id")
    void incrementViewCount(@Param("id") UUID id);
}
