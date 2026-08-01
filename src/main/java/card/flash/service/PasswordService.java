package card.flash.service;

import card.flash.entity.PasswordResetToken;
import card.flash.entity.User;
import card.flash.repository.PasswordResetTokenRepository;
import card.flash.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
@RequiredArgsConstructor
@Service
public class PasswordService {
    private final PasswordResetTokenRepository tokenRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder encoder;


    public String createResetToken(String usernameOrEmail) {
        User user = userRepo.findByUsername(usernameOrEmail)
                .or(() -> userRepo.findByEmail(usernameOrEmail))
                .orElseThrow(() -> new RuntimeException("User not found"));
        String token = UUID.randomUUID().toString();
        var prt = new PasswordResetToken();
        prt.setToken(token);
        prt.setUser(user);
        prt.setExpiryDate(LocalDateTime.now().plusHours(1));
        tokenRepo.save(prt);
        // TODO: send `token` to user via email
        return token;
    }

    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = tokenRepo.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid token"));
        if (prt.getExpiryDate().isBefore(LocalDateTime.now()))
            throw new RuntimeException("Token expired");
        User user = prt.getUser();
        user.setPassword(encoder.encode(newPassword));
        userRepo.save(user);
        tokenRepo.delete(prt);
    }
}
