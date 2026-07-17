package com.smart.Uni.entity;

import com.smart.Uni.enums.ResourceStatus;
import com.smart.Uni.enums.ResourceType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private ResourceType type;

    private String location;

    private Integer capacity;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ResourceStatus status = ResourceStatus.AVAILABLE;

    private String imageUrl;

    @CreationTimestamp
    private LocalDateTime createdAt;
}
