package com.easyrenting.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("select u from User u where lower(u.email) = lower(:email)")
    Optional<User> findByEmail(@Param("email") String email);

    @Query("select count(u) > 0 from User u where lower(u.email) = lower(:email)")
    boolean existsByEmail(@Param("email") String email);

    long countByRole(Role role);

    long countByRoleAndVerificationStatus(Role role, VerificationStatus status);

    Page<User> findByRoleAndVerificationStatus(Role role, VerificationStatus status, Pageable pageable);

    @Query("""
            select u from User u
            where (:role is null or u.role = :role)
              and (:q is null
                   or lower(u.name) like lower(concat('%', cast(:q as string), '%'))
                   or lower(u.email) like lower(concat('%', cast(:q as string), '%'))
                   or u.phone like concat('%', cast(:q as string), '%'))
            """)
    Page<User> search(@Param("q") String q, @Param("role") Role role, Pageable pageable);
}
