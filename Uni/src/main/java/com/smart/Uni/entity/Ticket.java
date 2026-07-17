package com.smart.Uni.entity;

import com.smart.Uni.enums.TicketCategory;
import com.smart.Uni.enums.TicketPriority;
import com.smart.Uni.enums.TicketStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tickets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // USER who created
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    // Assigned TECHNICIAN
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(nullable = false)
    private String contactDetails;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TicketCategory category = TicketCategory.OTHER;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TicketPriority priority = TicketPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TicketStatus status = TicketStatus.OPEN;

    @ElementCollection
    @CollectionTable(name = "ticket_images", joinColumns = @JoinColumn(name = "ticket_id"))
    @Column(name = "image_path")
    @Builder.Default
    private List<String> images = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private Resource resource;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Builder.Default
    private boolean isOther = false;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(columnDefinition = "TEXT")
    private String internalNotes;

    // Must be filled when moving IN_PROGRESS -> RESOLVED
    @Column(columnDefinition = "TEXT")
    private String resolutionExplanation;

    private LocalDateTime resolvedAt;

    // User interaction with RESOLVED stage
    @Builder.Default
    private boolean resolutionViewed = false;

    @Builder.Default
    private boolean resolutionAcknowledged = false;

    private LocalDateTime resolutionViewedAt;
    private LocalDateTime resolutionAcknowledgedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
