package card.flash;

import card.flash.entity.FlashcardSet;
import card.flash.entity.User;
import card.flash.repository.FlashcardSetRepository;
import card.flash.repository.UserRepository;
import card.flash.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SecurityRegressionTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired FlashcardSetRepository sets;
    @Autowired JwtUtil jwt;
    @Autowired PasswordEncoder encoder;

    @Test
    void passwordRecoveryNeverReturnsResetTokens() throws Exception {
        user("reset_owner");
        for (String endpoint : new String[]{"forgot-password", "reset-password"}) {
            mvc.perform(post("/api/auth/" + endpoint).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"username\":\"reset_owner\"}"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.resetToken").doesNotExist());
        }
    }

    @Test
    void nonOwnerSeesOnlyPublicSets() throws Exception {
        User owner = user("private_owner");
        User viewer = user("private_viewer");
        collection(owner, true, "Visible");
        collection(owner, false, "Secret");
        mvc.perform(get("/api/sets/user/private_owner").header("Authorization", bearer(viewer)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Visible"));
        mvc.perform(get("/api/sets/user/private_owner").header("Authorization", bearer(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void publicProfileDoesNotDiscloseEmailOrPassword() throws Exception {
        user("public_profile");
        mvc.perform(get("/api/users/public_profile")).andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("public_profile"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void logoutInvalidatesPreviouslyIssuedTokens() throws Exception {
        User owner = user("logout_owner");
        String first = bearer(owner), second = bearer(owner);
        mvc.perform(post("/api/auth/logout").header("Authorization", first)).andExpect(status().isNoContent());
        mvc.perform(get("/api/sets/me").header("Authorization", second)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/sets/me").header("Authorization", bearer(owner))).andExpect(status().isOk());
    }

    @Test
    void deletedAccountAndMalformedTokenAreUnauthorized() throws Exception {
        User owner = user("deleted_owner");
        String token = bearer(owner);
        users.delete(owner); users.flush();
        mvc.perform(get("/api/sets/me").header("Authorization", token)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/sets/me").header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    private User user(String name) {
        User user = new User();
        user.setUsername(name); user.setEmail(name + "@example.invalid");
        user.setPassword(encoder.encode("password123"));
        return users.saveAndFlush(user);
    }
    private String bearer(User user) { return "Bearer " + jwt.generateToken(user.getUsername()); }
    private void collection(User owner, boolean visible, String title) {
        var set = new FlashcardSet(); set.setOwner(owner); set.setPublic(visible); set.setTitle(title);
        sets.saveAndFlush(set);
    }
}
