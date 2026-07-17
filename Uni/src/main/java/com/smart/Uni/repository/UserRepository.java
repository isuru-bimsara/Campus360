package com.smart.Uni.repository;

import com.smart.Uni.entity.User;
import com.smart.Uni.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndDeletedFalse(String email);

    List<User> findByDeletedFalse();

    boolean existsByEmailAndDeletedFalse(String email);

    long countByDeletedFalse();

    long countByRoleAndDeletedFalse(UserRole role);

    long countByRole(UserRole role);

    List<User> findByRole(UserRole role); // ✅ FIX ADDED

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query(value = """
                SELECT role, COUNT(*)
                FROM users
                WHERE deleted = false
                GROUP BY role
            """, nativeQuery = true)
    List<Object[]> countUsersByRole();
}
