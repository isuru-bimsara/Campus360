package com.smart.Uni.entity;

import com.smart.Uni.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 64) // important
    private NotificationType type;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    private Long relatedId;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private Boolean read = false;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
