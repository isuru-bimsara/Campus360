package com.smart.Uni.service;

import com.smart.Uni.dto.request.CommentRequest;
import com.smart.Uni.dto.response.CommentResponse;
import com.smart.Uni.entity.Comment;
import com.smart.Uni.entity.Ticket;
import com.smart.Uni.entity.User;
import com.smart.Uni.exception.ResourceNotFoundException;
import com.smart.Uni.repository.CommentRepository;
import com.smart.Uni.repository.TicketRepository;
import com.smart.Uni.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public CommentResponse addComment(Long ticketId, CommentRequest request, String email) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Comment comment = Comment.builder()
                .ticket(ticket)
                .user(user)
                .content(request.getContent())
                .build();

        Comment saved = commentRepository.save(comment);
        notificationService.notifyCommentAdded(ticket, user);
        return toResponse(saved);
    }

    public List<CommentResponse> getCommentsByTicket(Long ticketId) {
        return commentRepository.findByTicketIdAndDeletedFalseOrderByCreatedAtAsc(ticketId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Only comment owner can update comment
     */
    @Transactional
    public CommentResponse updateComment(Long id, CommentRequest request, String email) {
        Comment comment = findCommentById(id);
        User actor = findUserByEmail(email);

        if (!comment.getUser().getId().equals(actor.getId())) {
            throw new RuntimeException("You can only edit your own comments.");
        }

        comment.setContent(request.getContent());
        Comment saved = commentRepository.save(comment);
        return toResponse(saved);
    }

    /**
     * Only comment owner can soft-delete comment
     */
    @Transactional
    public void deleteComment(Long id, String email) {
        Comment comment = findCommentById(id);
        User actor = findUserByEmail(email);

        if (!comment.getUser().getId().equals(actor.getId())) {
            throw new RuntimeException("You can only delete your own comments.");
        }

        comment.setDeleted(true); // soft delete
        commentRepository.save(comment);
    }

    private Comment findCommentById(Long id) {
        return commentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found with id: " + id));
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private CommentResponse toResponse(Comment c) {
        return CommentResponse.builder()
                .id(c.getId())
                .ticketId(c.getTicket().getId())
                .userId(c.getUser().getId())
                .userName(c.getUser().getName())
                .userRole(c.getUser().getRole().name())
                .content(c.getContent())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
