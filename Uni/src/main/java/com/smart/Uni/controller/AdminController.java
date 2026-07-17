package com.smart.Uni.controller;

import com.smart.Uni.dto.response.ApiResponse;
import com.smart.Uni.dto.response.UserResponse;
import com.smart.Uni.enums.BookingStatus;
import com.smart.Uni.enums.UserRole;
import com.smart.Uni.repository.BookingRepository;
import com.smart.Uni.repository.TicketRepository;
import com.smart.Uni.repository.UserRepository;
import com.smart.Uni.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success(userService.getAllUsers()));
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        UserRole role = UserRole.valueOf(body.get("role"));
        return ResponseEntity.ok(ApiResponse.success("Role updated", userService.updateRole(id, role)));
    }

    // NEW: ban user
    @PatchMapping("/users/{id}/ban")
    public ResponseEntity<ApiResponse<UserResponse>> banUser(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body == null ? null : body.get("reason");
        return ResponseEntity.ok(ApiResponse.success("User banned", userService.banUser(id, reason)));
    }

    // NEW: unban user
    @PatchMapping("/users/{id}/unban")
    public ResponseEntity<ApiResponse<UserResponse>> unbanUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("User unbanned", userService.unbanUser(id)));
    }

    // @GetMapping("/stats")
    // public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {

    //     // =========================
    //     // USER COUNTS (FIXED)
    //     // =========================

    //     long totalUsers = userRepository.countByDeletedFalse();

    //     long adminCount = userRepository.countByRoleAndDeletedFalse(UserRole.ADMIN);
    //     long opsCount = userRepository.countByRoleAndDeletedFalse(UserRole.OPERATION_MANAGER);
    //     long techCount = userRepository.countByRoleAndDeletedFalse(UserRole.TECHNICIAN);
    //     long userCount = userRepository.countByRoleAndDeletedFalse(UserRole.USER);

    //     // =========================
    //     // BOOKINGS + TICKETS
    //     // =========================

    //     long bookingsCount = bookingRepository.count();
    //     long pendingBookings = bookingRepository.countByStatus(BookingStatus.PENDING);
    //     long ticketsCount = ticketRepository.count();

    //     // =========================
    //     // DISTRIBUTIONS
    //     // =========================

    //     List<Map<String, Object>> bookingDistribution = List.of(
    //             Map.of("name", "Approved", "value", bookingRepository.countByStatus(BookingStatus.APPROVED)),
    //             Map.of("name", "Pending", "value", pendingBookings),
    //             Map.of("name", "Rejected", "value", bookingRepository.countByStatus(BookingStatus.REJECTED))
    //     );

    //     List<Map<String, Object>> roleDistribution = List.of(
    //             Map.of("name", "Admin", "value", adminCount),
    //             Map.of("name", "Ops Manager", "value", opsCount),
    //             Map.of("name", "Technician", "value", techCount),
    //             Map.of("name", "User", "value", userCount)
    //     );

    //     // =========================
    //     // RESPONSE MAP
    //     // =========================

    //     Map<String, Object> data = new HashMap<>();

    //     data.put("users", totalUsers);
    //     data.put("adminCount", adminCount);
    //     data.put("opsCount", opsCount);
    //     data.put("techCount", techCount);
    //     data.put("userCount", userCount);

    //     data.put("bookings", bookingsCount);
    //     data.put("pendingBookings", pendingBookings);
    //     data.put("tickets", ticketsCount);

    //     data.put("bookingDistribution", bookingDistribution);
    //     data.put("roleDistribution", roleDistribution);

    //     return ResponseEntity.ok(ApiResponse.success(data));
    // }

     @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {

        // ================= USERS =================
        long totalUsers = userRepository.countByDeletedFalse();
        long adminCount = userRepository.countByRoleAndDeletedFalse(UserRole.ADMIN);
        long opsCount = userRepository.countByRoleAndDeletedFalse(UserRole.OPERATION_MANAGER);
        long techCount = userRepository.countByRoleAndDeletedFalse(UserRole.TECHNICIAN);
        long userCount = userRepository.countByRoleAndDeletedFalse(UserRole.USER);

        // ================= BOOKINGS =================
        long bookingsCount = bookingRepository.count();
        long pendingBookings = bookingRepository.countByStatus(BookingStatus.PENDING);
        long ticketsCount = ticketRepository.count();

        // ================= BOOKING DISTRIBUTION =================
        List<Map<String, Object>> bookingDistribution = List.of(
                Map.of("name", "Approved", "value", bookingRepository.countByStatus(BookingStatus.APPROVED)),
                Map.of("name", "Pending", "value", pendingBookings),
                Map.of("name", "Rejected", "value", bookingRepository.countByStatus(BookingStatus.REJECTED))
        );

        // ================= ROLE DISTRIBUTION =================
        List<Map<String, Object>> roleDistribution = List.of(
                Map.of("name", "Admin", "value", adminCount),
                Map.of("name", "Ops Manager", "value", opsCount),
                Map.of("name", "Technician", "value", techCount),
                Map.of("name", "User", "value", userCount)
        );

        // ================= USER GROWTH (LAST 7 DAYS) =================
        List<Map<String, Object>> userGrowth = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {

            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(LocalTime.MAX);

            String day = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);

            long dailyUsers = userRepository.countByCreatedAtBetween(start, end);

            userGrowth.add(Map.of(
                    "name", day,
                    "count", dailyUsers
            ));
        }

        // ================= ACTIVITY TRENDS =================
        List<Map<String, Object>> activityTrends = new ArrayList<>();

        for (int i = 6; i >= 0; i--) {

            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(LocalTime.MAX);

            String day = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);

            long dailyBookings = bookingRepository.countByCreatedAtBetween(start, end);
            long dailyTickets = ticketRepository.countByCreatedAtBetween(start, end);

            activityTrends.add(Map.of(
                    "name", day,
                    "bookings", dailyBookings,
                    "tickets", dailyTickets
            ));
        }

        // ================= RESPONSE =================
        Map<String, Object> data = new HashMap<>();

        data.put("users", totalUsers);
        data.put("adminCount", adminCount);
        data.put("opsCount", opsCount);
        data.put("techCount", techCount);
        data.put("userCount", userCount);

        data.put("bookings", bookingsCount);
        data.put("pendingBookings", pendingBookings);
        data.put("tickets", ticketsCount);

        data.put("bookingDistribution", bookingDistribution);
        data.put("roleDistribution", roleDistribution);

        // 🔥 IMPORTANT FIX (your missing data)
        data.put("userGrowth", userGrowth);
        data.put("activityTrends", activityTrends);

        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
