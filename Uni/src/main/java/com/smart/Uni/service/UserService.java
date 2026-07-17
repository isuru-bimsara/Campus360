package com.smart.Uni.service;

import com.smart.Uni.dto.request.LoginRequest;
import com.smart.Uni.dto.request.RegisterRequest;
import com.smart.Uni.dto.response.AuthResponse;
import com.smart.Uni.dto.response.UserResponse;
import com.smart.Uni.entity.User;
import com.smart.Uni.enums.UserRole;
import com.smart.Uni.repository.UserRepository;
import com.smart.Uni.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final NotificationService notificationService;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return mapToResponse(user);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailAndDeletedFalse(request.getEmail())) {
            throw new IllegalArgumentException("Email is already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .name(request.getName())
                .provider("local")
                .password(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.USER)
                .active(true)
                .deleted(false)
                .banned(false)
                .build();

        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(user.getEmail());
        return AuthResponse.builder()
                .token(token)
                .user(mapToResponse(user))
                .banned(false)
                .message("Login successful")
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailAndDeletedFalse(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtTokenProvider.generateToken(user.getEmail());

        if (user.isBanned()) {
            String reason = (user.getBanReason() == null || user.getBanReason().isBlank())
                    ? "Your account has been banned by admin."
                    : user.getBanReason();

            return AuthResponse.builder()
                    .token(token) // allow login token
                    .user(mapToResponse(user))
                    .banned(true)
                    .message(reason)
                    .build();
        }

        return AuthResponse.builder()
                .token(token)
                .user(mapToResponse(user))
                .banned(false)
                .message("Login successful")
                .build();
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findByDeletedFalse().stream().map(this::mapToResponse).toList();
    }

    @Transactional
    public UserResponse updateRole(Long id, UserRole role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setRole(role);
        User saved = userRepository.save(user);
        notificationService.notifyRoleChanged(saved, role, "Admin");
        return mapToResponse(saved);
    }

    @Transactional
    public UserResponse banUser(Long id, String reason) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getRole() == UserRole.ADMIN) {
            throw new IllegalArgumentException("Admin user cannot be banned");
        }

        user.setBanned(true);
        user.setBanReason((reason == null || reason.isBlank()) ? "Your account has been banned by admin." : reason);
        user.setBannedAt(LocalDateTime.now());

        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse unbanUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setBanned(false);
        user.setBanReason(null);
        user.setBannedAt(null);

        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateProfile(String email, String name, MultipartFile file) throws IOException {
        User user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (name != null && !name.trim().isEmpty()) user.setName(name);

        if (file != null && !file.isEmpty()) {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

            String fileName = UUID.randomUUID() + "_" + StringUtils.cleanPath(file.getOriginalFilename());
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            user.setPicture("/uploads/" + fileName);
        }

        return mapToResponse(userRepository.save(user));
    }

    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getProvider() != null && user.getProvider().equals("google")) {
            throw new IllegalArgumentException("Accounts linked with Google cannot change password here.");
        }

        if (user.getPassword() == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .picture(user.getPicture())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .banned(user.isBanned())
                .banReason(user.getBanReason())
                .build();
    }

    @Transactional
    public void deleteCurrentUser(String email) {
        User user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String picture = user.getPicture();
        if (picture != null && picture.startsWith("/uploads/")) {
            try {
                String fileName = picture.replace("/uploads/", "");
                Path filePath = Paths.get(uploadDir).resolve(fileName);
                Files.deleteIfExists(filePath);
            } catch (Exception ignored) {}
        }

        String anon = "deleted_user_" + user.getId();
        user.setName("Deleted User");
        user.setPicture(null);
        user.setProviderId(null);
        user.setPassword(null);
        user.setActive(false);
        user.setDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        user.setEmail(anon + "@deleted.local");
        userRepository.save(user);
    }
}