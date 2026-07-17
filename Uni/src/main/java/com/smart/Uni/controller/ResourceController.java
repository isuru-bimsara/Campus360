package com.smart.Uni.controller;

import com.smart.Uni.dto.request.ResourceRequest;
import com.smart.Uni.dto.response.ResourceResponse;
import com.smart.Uni.service.ResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(resourceService.getAllResources());
    }

    @PostMapping
    @PreAuthorize("hasRole('OPERATION_MANAGER')")
    public ResponseEntity<?> create(@RequestBody ResourceRequest request,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        String actorEmail = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(resourceService.createResource(request, actorEmail));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('OPERATION_MANAGER')")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody ResourceRequest request,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        String actorEmail = userDetails != null ? userDetails.getUsername() : null;
        return ResponseEntity.ok(resourceService.updateResource(id, request, actorEmail));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('OPERATION_MANAGER')")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                    @AuthenticationPrincipal UserDetails userDetails) {
        String actorEmail = userDetails != null ? userDetails.getUsername() : null;
        resourceService.deleteResource(id, actorEmail);
        return ResponseEntity.ok("Resource deleted");
    }

    @PostMapping("/upload")
    @PreAuthorize("hasRole('OPERATION_MANAGER')")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        try {
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            File destination = new File(dir, fileName);
            file.transferTo(destination);
            return ResponseEntity.ok("/uploads/" + fileName);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Upload failed: " + e.getMessage());
        }
    }

    @GetMapping("/available")
    public ResponseEntity<List<ResourceResponse>> getAvailable() {
        return ResponseEntity.ok(resourceService.getAllResources());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResourceResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(resourceService.getResourceById(id));
    }
}
