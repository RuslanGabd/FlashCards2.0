package card.flash.controller;


import card.flash.dto.UserDto;
import card.flash.dto.SignupRequest;
import card.flash.entity.User;
import card.flash.repository.UserRepository;
import card.flash.security.JwtUtil;
import card.flash.service.PasswordService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PasswordService passwordService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil, PasswordService passwordService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.passwordService = passwordService;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@RequestBody SignupRequest request) {
        if (userRepository.findByUsername(request.username()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already taken");
        }
        if (userRepository.findByEmail(request.email()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already taken");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(UserDto.from(savedUser));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest authRequest) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authRequest.username, authRequest.password)
            );
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body("Invalid username or password");
        }

        UserDetails userDetails = userRepository.findByUsername(authRequest.username)
                .or(() -> userRepository.findByEmail(authRequest.username))
                .map(user -> org.springframework.security.core.userdetails.User
                        .withUsername(user.getUsername())
                        .password(user.getPassword())
                        .authorities("ROLE_USER")
                        .build())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String jwt = jwtUtil.generateToken(userDetails.getUsername());
        return ResponseEntity.ok(new AuthResponse(jwt));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String,String> body) {
        String userOrEmail = body.get("username");
        String token = passwordService.createResetToken(userOrEmail);
        // For MVP return token in body; in prod email it.
        return ResponseEntity.ok(Map.of("resetToken", token));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String,String> body) {
        passwordService.resetPassword(body.get("token"), body.get("newPassword"));
        return ResponseEntity.ok("Password reset successful");
    }

    static class AuthRequest {
        public String username;
        public String password;
    }

    static class AuthResponse {
        public String token;

        public AuthResponse(String token) {
            this.token = token;
        }
    }
}
