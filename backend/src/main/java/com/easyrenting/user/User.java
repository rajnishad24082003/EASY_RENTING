package com.easyrenting.user;

import com.easyrenting.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Locale;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(nullable = false, length = 10)
    private String phone;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 16)
    private VerificationStatus verificationStatus;

    @Column(name = "verification_submitted_at")
    private Instant verificationSubmittedAt;

    @Column(name = "verification_reviewed_at")
    private Instant verificationReviewedAt;

    @Column(name = "verification_rejection_reason", length = 500)
    private String verificationRejectionReason;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(nullable = false)
    private boolean suspended;

    protected User() {
    }

    public User(String name, String email, String phone, String passwordHash, Role role) {
        this.name = name;
        this.email = normaliseEmail(email);
        this.phone = phone;
        this.passwordHash = passwordHash;
        this.role = role;
        this.verificationStatus = role == Role.ADMIN ? VerificationStatus.VERIFIED : VerificationStatus.UNVERIFIED;
    }

    public static String normaliseEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    public void updateProfile(String name, String phone) {
        if (name != null) {
            this.name = name.trim();
        }
        if (phone != null) {
            this.phone = phone;
        }
    }

    public void submitVerification(Instant now) {
        this.verificationStatus = VerificationStatus.PENDING;
        this.verificationSubmittedAt = now;
        this.verificationReviewedAt = null;
        this.verificationRejectionReason = null;
    }

    public void approveVerification(Instant now) {
        this.verificationStatus = VerificationStatus.VERIFIED;
        this.verificationReviewedAt = now;
        this.verificationRejectionReason = null;
    }

    public void rejectVerification(String reason, Instant now) {
        this.verificationStatus = VerificationStatus.REJECTED;
        this.verificationReviewedAt = now;
        this.verificationRejectionReason = reason;
    }

    public void suspend() {
        this.suspended = true;
    }

    public void unsuspend() {
        this.suspended = false;
    }

    public boolean isVerified() {
        return verificationStatus == VerificationStatus.VERIFIED;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public Instant getVerificationSubmittedAt() {
        return verificationSubmittedAt;
    }

    public Instant getVerificationReviewedAt() {
        return verificationReviewedAt;
    }

    public String getVerificationRejectionReason() {
        return verificationRejectionReason;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public boolean isSuspended() {
        return suspended;
    }
}
