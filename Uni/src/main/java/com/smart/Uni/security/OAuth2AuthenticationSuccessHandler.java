package com.smart.Uni.security;

import com.smart.Uni.entity.User;
import com.smart.Uni.enums.UserRole;
import com.smart.Uni.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @Value("${app.cors.allowed-origins}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String googleName = oAuth2User.getAttribute("name");
        String googlePicture = oAuth2User.getAttribute("picture");
        String providerId = oAuth2User.getAttribute("sub");

        if (email == null || email.isBlank()) {
            throw new ServletException("Google account email is missing");
        }

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = User.builder()
                    .email(email)
                    .name(googleName)
                    .picture(googlePicture)
                    .provider("google")
                    .providerId(providerId)
                    .role(UserRole.USER)
                    .build();
            return userRepository.save(newUser);
        });

        // IMPORTANT:
        // Do NOT overwrite custom profile name/picture on each login.
        // Only backfill missing fields.
        boolean changed = false;

        if (user.getProvider() == null || user.getProvider().isBlank()) {
            user.setProvider("google");
            changed = true;
        }

        if ((user.getProviderId() == null || user.getProviderId().isBlank())
                && providerId != null && !providerId.isBlank()) {
            user.setProviderId(providerId);
            changed = true;
        }

        if ((user.getName() == null || user.getName().isBlank())
                && googleName != null && !googleName.isBlank()) {
            user.setName(googleName);
            changed = true;
        }

        if ((user.getPicture() == null || user.getPicture().isBlank())
                && googlePicture != null && !googlePicture.isBlank()) {
            user.setPicture(googlePicture);
            changed = true;
        }

        if (changed) {
            userRepository.save(user);
        }

        String token = jwtTokenProvider.generateToken(email);
        String redirectUrl = frontendUrl + "/auth/callback?token=" + token;
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
