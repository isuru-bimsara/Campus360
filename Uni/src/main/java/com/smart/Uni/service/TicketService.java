package com.smart.Uni.service;

import com.smart.Uni.dto.request.ResolutionAcknowledgeRequest;
import com.smart.Uni.dto.request.TicketRequest;
import com.smart.Uni.dto.response.TicketResponse;
import com.smart.Uni.entity.*;
import com.smart.Uni.enums.TicketCategory;
import com.smart.Uni.enums.TicketPriority;
import com.smart.Uni.enums.TicketStatus;
import com.smart.Uni.enums.UserRole;
import com.smart.Uni.exception.ResourceNotFoundException;
import com.smart.Uni.repository.BookingRepository;
import com.smart.Uni.repository.ResourceRepository;
import com.smart.Uni.repository.TicketRepository;
import com.smart.Uni.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.hibernate.ObjectNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private static final int MAX_IMAGES = 3;

    @Transactional
    public TicketResponse createTicket(TicketRequest request, List<MultipartFile> images, String email) throws IOException {
        User reporter = findUserByEmail(email);

        List<String> imagePaths = new ArrayList<>();
        if (images != null && !images.isEmpty()) {
            if (images.size() > MAX_IMAGES) throw new IllegalArgumentException("Maximum 3 images allowed");
            for (MultipartFile file : images) {
                imagePaths.add(saveImage(file));
            }
        }

        Ticket.TicketBuilder builder = Ticket.builder()
                .reporter(reporter)
                .title(request.getTitle())
                .description(request.getDescription())
                .contactDetails(request.getContactDetails())
                .category(request.getCategory() != null ? request.getCategory() : TicketCategory.OTHER)
                .priority(request.getPriority() != null ? request.getPriority() : TicketPriority.MEDIUM)
                .status(TicketStatus.OPEN)
                .images(imagePaths);

        if (Boolean.TRUE.equals(request.getIsOther())) {
            builder.isOther(true).booking(null).resource(null);
        } else {
            if (request.getBookingId() != null) {
                Booking b = bookingRepository.findById(request.getBookingId())
                        .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
                if (!Objects.equals(b.getUser().getId(), reporter.getId())) {
                    throw new IllegalArgumentException("You can only select your own booking");
                }
                builder.booking(b);
                if (b.getResource() != null) builder.resource(b.getResource());
            } else {
                throw new IllegalArgumentException("Booking must be selected unless 'Other' is checked");
            }
        }

        Ticket saved = ticketRepository.save(builder.build());
        notificationService.notifyTicketCreated(saved);
        return toResponse(saved);
    }

    public List<TicketResponse> getAllTickets() {
        return ticketRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<TicketResponse> getUserTickets(String email) {
        User u = findUserByEmail(email);
        return ticketRepository.findByReporterId(u.getId()).stream().map(this::toResponse).collect(Collectors.toList());
    }

    public TicketResponse getTicketById(Long id) {
        return toResponse(findTicketById(id));
    }

    @Transactional
    public TicketResponse takeResponsibility(Long ticketId, String techEmail) {
        Ticket t = findTicketById(ticketId);
        User tech = findUserByEmail(techEmail);

        if (tech.getRole() != UserRole.TECHNICIAN) {
            throw new RuntimeException("Only technician can take ticket");
        }
        if (t.getAssignee() != null) {
            throw new RuntimeException("Ticket already assigned to " + t.getAssignee().getName());
        }
        if (t.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Only OPEN tickets can be assigned");
        }

        t.setAssignee(tech);
        // strict OPEN -> IN_PROGRESS as soon as assigned
        TicketStatus prev = t.getStatus();
        t.setStatus(TicketStatus.IN_PROGRESS);

        Ticket saved = ticketRepository.save(t);
        notificationService.notifyTicketAssigned(saved);
        notificationService.notifyTicketTransition(saved, prev, TicketStatus.IN_PROGRESS, "Assigned technician: " + tech.getName());
        return toResponse(saved);
    }

    @Transactional
    public TicketResponse updateStatus(Long ticketId, TicketStatus next, String actorEmail) {
        Ticket t = findTicketById(ticketId);
        User actor = findUserByEmail(actorEmail);

        // Only assigned technician can update lifecycle status
        validateAssignedTechnicianAccess(t, actor);

        TicketStatus current = t.getStatus();
        validateSequentialTransition(current, next);

        if (next == TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Use resolve endpoint with mandatory resolution note");
        }

        t.setStatus(next);
        if (next == TicketStatus.CLOSED) {
            // closed time via resolvedAt if already there; keep resolvedAt unchanged
        }

        Ticket saved = ticketRepository.save(t);
        notificationService.notifyTicketTransition(saved, current, next, null);
        return toResponse(saved);
    }

    @Transactional
    public TicketResponse resolveTicket(Long ticketId, String explanation, String internalNotes, String techEmail) {
        Ticket t = findTicketById(ticketId);
        User tech = findUserByEmail(techEmail);

        validateAssignedTechnicianAccess(t, tech);

        if (t.getStatus() != TicketStatus.IN_PROGRESS) {
            throw new IllegalArgumentException("Ticket must be IN_PROGRESS to resolve");
        }
        if (explanation == null || explanation.isBlank()) {
            throw new IllegalArgumentException("Resolution note is mandatory when moving to RESOLVED");
        }

        TicketStatus prev = t.getStatus();
        t.setResolutionExplanation(explanation.trim());
        t.setInternalNotes(internalNotes);
        t.setResolvedAt(LocalDateTime.now());
        t.setStatus(TicketStatus.RESOLVED);

        Ticket saved = ticketRepository.save(t);
        notificationService.notifyTicketTransition(
                saved,
                prev,
                TicketStatus.RESOLVED,
                "Resolution note available for review."
        );
        return toResponse(saved);
    }

    @Transactional
    public TicketResponse rejectTicket(Long id, String reason, String managerEmail) {
        User manager = findUserByEmail(managerEmail);
        if (manager.getRole() != UserRole.OPERATION_MANAGER) {
            throw new RuntimeException("Only OPERATION_MANAGER can reject");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Rejection reason is mandatory");
        }

        Ticket t = findTicketById(id);
        if (t.getStatus() == TicketStatus.CLOSED || t.getStatus() == TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Resolved/Closed ticket cannot be rejected");
        }

        TicketStatus prev = t.getStatus();
        t.setStatus(TicketStatus.REJECTED);
        t.setRejectionReason(reason.trim());

        Ticket saved = ticketRepository.save(t);
        notificationService.notifyTicketTransition(saved, prev, TicketStatus.REJECTED, "Reason: " + reason.trim());
        return toResponse(saved);
    }

    // User opens RESOLVED details => mark viewed
    @Transactional
    public TicketResponse markResolutionViewed(Long ticketId, String userEmail) {
        Ticket t = findTicketById(ticketId);
        User user = findUserByEmail(userEmail);
        validateReporterAccess(t, user);

        if (t.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Only RESOLVED ticket can be viewed as resolution");
        }

        if (!t.isResolutionViewed()) {
            t.setResolutionViewed(true);
            t.setResolutionViewedAt(LocalDateTime.now());
        }

        return toResponse(ticketRepository.save(t));
    }

    // User acknowledges resolution => AUTO CLOSE
    @Transactional
    public TicketResponse acknowledgeResolution(Long ticketId, ResolutionAcknowledgeRequest req, String userEmail) {
        Ticket t = findTicketById(ticketId);
        User user = findUserByEmail(userEmail);
        validateReporterAccess(t, user);

        if (t.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("Ticket is not in RESOLVED state");
        }
        if (req == null || !req.isAcknowledged()) {
            throw new IllegalArgumentException("Acknowledgement required to close ticket");
        }

        t.setResolutionViewed(true);
        if (t.getResolutionViewedAt() == null) t.setResolutionViewedAt(LocalDateTime.now());

        t.setResolutionAcknowledged(true);
        t.setResolutionAcknowledgedAt(LocalDateTime.now());

        TicketStatus prev = t.getStatus();
        t.setStatus(TicketStatus.CLOSED); // auto close rule

        Ticket saved = ticketRepository.save(t);
        notificationService.notifyResolutionAcknowledged(saved);
        notificationService.notifyTicketTransition(saved, prev, TicketStatus.CLOSED, "Auto-closed after user acknowledgement.");
        return toResponse(saved);
    }

    public void deleteTicketByUser(Long id, String email) {
        Ticket t = findTicketById(id);
        User user = findUserByEmail(email);
        validateReporterAccess(t, user);

        if (t.getStatus() != TicketStatus.OPEN) {
            throw new RuntimeException("Only OPEN tickets can be deleted");
        }
        ticketRepository.deleteById(id);
    }

    public List<TicketResponse> getTicketsByCategory(TicketCategory category) {
        return ticketRepository.findByCategory(category).stream().map(this::toResponse).collect(Collectors.toList());
    }

    private void validateAssignedTechnicianAccess(Ticket t, User actor) {
        if (actor.getRole() != UserRole.TECHNICIAN) {
            throw new RuntimeException("Only assigned technician can modify ticket");
        }
        if (t.getAssignee() == null) {
            throw new RuntimeException("Ticket not assigned yet");
        }
        if (!Objects.equals(t.getAssignee().getId(), actor.getId())) {
            throw new RuntimeException("Ticket assigned to " + t.getAssignee().getName() + ". Access denied.");
        }
    }

    private void validateReporterAccess(Ticket t, User user) {
        if (!Objects.equals(t.getReporter().getId(), user.getId())) {
            throw new RuntimeException("Only ticket owner can perform this action");
        }
    }

    // Strict lifecycle: OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
    private void validateSequentialTransition(TicketStatus current, TicketStatus next) {
        boolean valid = switch (current) {
            case OPEN -> next == TicketStatus.IN_PROGRESS;
            case IN_PROGRESS -> next == TicketStatus.RESOLVED;
            case RESOLVED -> next == TicketStatus.CLOSED;
            case CLOSED, REJECTED -> false;
        };
        if (!valid) {
            throw new IllegalArgumentException("Invalid transition: " + current + " -> " + next);
        }
    }

    private String saveImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;

        Path base = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path ticketDir = base.resolve("tickets");
        if (!Files.exists(ticketDir)) Files.createDirectories(ticketDir);

        String original = file.getOriginalFilename() == null ? "image" : file.getOriginalFilename().replaceAll("\\s+", "_");
        String filename = UUID.randomUUID() + "_" + original;

        Path target = ticketDir.resolve(filename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/tickets/" + filename;
    }

    private Ticket findTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found: " + id));
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private TicketResponse toResponse(Ticket t) {
        Long responseMinutes = null;
        if (t.getResolvedAt() != null) {
            responseMinutes = ChronoUnit.MINUTES.between(t.getCreatedAt(), t.getResolvedAt());
        }

        return TicketResponse.builder()
                .id(t.getId())
                .reporterId(safeGet(() -> t.getReporter().getId(), null))
                .reporterName(safeGet(() -> t.getReporter().getName(), "Unknown User"))
                .assigneeId(safeGet(() -> t.getAssignee() != null ? t.getAssignee().getId() : null, null))
                .assigneeName(safeGet(() -> t.getAssignee() != null ? t.getAssignee().getName() : null, null))
                .title(t.getTitle())
                .description(t.getDescription())
                .contactDetails(t.getContactDetails())
                .category(t.getCategory())
                .priority(t.getPriority())
                .status(t.getStatus())
                .images(t.getImages())
                .resourceId(safeGet(() -> t.getResource() != null ? t.getResource().getId() : null, null))
                .resourceName(safeGet(() -> t.getResource() != null ? t.getResource().getName() : null, null))
                .bookingId(safeGet(() -> t.getBooking() != null ? t.getBooking().getId() : null, null))
                .isOther(t.isOther())
                .rejectionReason(t.getRejectionReason())
                .internalNotes(t.getInternalNotes())
                .resolutionExplanation(t.getResolutionExplanation())
                .resolvedAt(t.getResolvedAt())
                .resolutionViewed(t.isResolutionViewed())
                .resolutionAcknowledged(t.isResolutionAcknowledged())
                .resolutionViewedAt(t.getResolutionViewedAt())
                .resolutionAcknowledgedAt(t.getResolutionAcknowledgedAt())
                .createdAt(t.getCreatedAt())
                .responseTimeMinutes(responseMinutes)
                .build();
    }

    private <T> T safeGet(Supplier<T> getter, T fallback) {
        try {
            return getter.get();
        } catch (EntityNotFoundException | ObjectNotFoundException e) {
            return fallback;
        } catch (RuntimeException e) {
            String message = e.getMessage();
            if (message != null && message.contains("Unable to find")) {
                return fallback;
            }
            throw e;
        }
    }
}
