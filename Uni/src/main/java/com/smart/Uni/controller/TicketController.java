package com.smart.Uni.controller;

import com.smart.Uni.dto.request.CommentRequest;
import com.smart.Uni.dto.request.ResolutionAcknowledgeRequest;
import com.smart.Uni.dto.request.TicketRequest;
import com.smart.Uni.dto.response.ApiResponse;
import com.smart.Uni.dto.response.CommentResponse;
import com.smart.Uni.dto.response.TicketResponse;
import com.smart.Uni.enums.TicketCategory;
import com.smart.Uni.enums.TicketStatus;
import com.smart.Uni.service.CommentService;
import com.smart.Uni.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;
    private final CommentService commentService;

    /* =========================================================
       TICKET CRUD + WORKFLOW
       ========================================================= */

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<TicketResponse>> createTicket(
            @RequestPart("ticket") @Valid TicketRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal UserDetails userDetails) throws IOException {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success(
                        "Ticket created",
                        ticketService.createTicket(request, images, userDetails.getUsername())
                )
        );
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN', 'OPERATION_MANAGER')")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getAllTickets() {
        return ResponseEntity.ok(ApiResponse.success(ticketService.getAllTickets()));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getMyTickets(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(ticketService.getUserTickets(userDetails.getUsername())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TicketResponse>> getTicketById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(ticketService.getTicketById(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<String>> deleteTicket(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        ticketService.deleteTicketByUser(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Ticket deleted", null));
    }

    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyRole('ADMIN','TECHNICIAN','OPERATION_MANAGER')")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getByCategory(@PathVariable TicketCategory category) {
        return ResponseEntity.ok(ApiResponse.success(ticketService.getTicketsByCategory(category)));
    }

    /* =========================================================
       TECHNICIAN / OPERATION MANAGER ACTIONS
       ========================================================= */

    @PostMapping("/{id}/take")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<ApiResponse<TicketResponse>> takeResponsibility(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                "Ticket assigned",
                ticketService.takeResponsibility(id, userDetails.getUsername())
        ));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<ApiResponse<TicketResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam TicketStatus status,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                "Status updated",
                ticketService.updateStatus(id, status, userDetails.getUsername())
        ));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<ApiResponse<TicketResponse>> resolveTicket(
            @PathVariable Long id,
            @RequestParam String explanation,
            @RequestParam(required = false) String internalNotes,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                "Ticket resolved",
                ticketService.resolveTicket(id, explanation, internalNotes, userDetails.getUsername())
        ));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('OPERATION_MANAGER')")
    public ResponseEntity<ApiResponse<TicketResponse>> rejectTicket(
            @PathVariable Long id,
            @RequestParam String reason,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                "Ticket rejected",
                ticketService.rejectTicket(id, reason, userDetails.getUsername())
        ));
    }

    /* =========================================================
       USER RESOLUTION ACTIONS
       ========================================================= */

    @PostMapping("/{id}/resolution/view")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<TicketResponse>> markResolutionViewed(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                "Resolution viewed",
                ticketService.markResolutionViewed(id, userDetails.getUsername())
        ));
    }

    @PostMapping("/{id}/resolution/ack")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<TicketResponse>> acknowledgeResolution(
            @PathVariable Long id,
            @RequestBody ResolutionAcknowledgeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                "Resolution acknowledged. Ticket closed.",
                ticketService.acknowledgeResolution(id, request, userDetails.getUsername())
        ));
    }

    /* =========================================================
       COMMENTS (USER + TECHNICIAN can update/delete own comments)
       ========================================================= */

    @PostMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable Long id,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success(
                        "Comment added",
                        commentService.addComment(id, request, userDetails.getUsername())
                )
        );
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(commentService.getCommentsByTicket(id)));
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable Long commentId,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                "Comment updated",
                commentService.updateComment(commentId, request, userDetails.getUsername())
        ));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        commentService.deleteComment(commentId, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Comment deleted", null));
    }
}
