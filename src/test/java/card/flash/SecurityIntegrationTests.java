package card.flash;

import card.flash.entity.Flashcard;
import card.flash.entity.FlashcardSet;
import card.flash.entity.User;
import card.flash.repository.FlashcardRepository;
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
class SecurityIntegrationTests {

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired FlashcardSetRepository setRepository;
    @Autowired FlashcardRepository cardRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtUtil jwtUtil;

    @Test
    void externalApisRequireAuthenticationAndUseUnifiedErrorBody() throws Exception {
        mockMvc.perform(post("/api/ai/create-set")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Test\",\"text\":\"Some text\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.path").value("/api/ai/create-set"));
    }

    @Test
    void loginReturnsJwtAndRejectsInvalidCredentials() throws Exception {
        user("login_user");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"login_user\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"login_user\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    void anonymousUserCanReadPublicButNotPrivateCards() throws Exception {
        User owner = user("security_owner");
        FlashcardSet publicSet = set(owner, true, "Public");
        FlashcardSet privateSet = set(owner, false, "Private");

        mockMvc.perform(get("/api/flashcards/set/{id}", publicSet.getId()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/flashcards/set/{id}", privateSet.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        mockMvc.perform(get("/api/flashcards/set/{id}", privateSet.getId())
                        .header("Authorization", bearer(owner)))
                .andExpect(status().isOk());
    }

    @Test
    void authenticatedUserCannotModifyAnotherUsersResources() throws Exception {
        User owner = user("resource_owner");
        User attacker = user("resource_attacker");
        FlashcardSet set = set(owner, false, "Owner set");
        Flashcard card = new Flashcard();
        card.setTerm("term");
        card.setDefinition("definition");
        card.setSet(set);
        card = cardRepository.save(card);
        String bearer = bearer(attacker);

        mockMvc.perform(post("/api/flashcards/set/{id}", set.getId())
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"term\":\"new\",\"definition\":\"card\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/flashcards/{id}", card.getId())
                        .header("Authorization", bearer))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/sets/{id}", set.getId())
                        .header("Authorization", bearer))
                .andExpect(status().isForbidden());
    }

    @Test
    void invalidDtoReturnsFieldErrors() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"x\",\"email\":\"bad\",\"password\":\"123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Request validation failed"))
                .andExpect(jsonPath("$.fieldErrors.username").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    private User user(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPassword(passwordEncoder.encode("password123"));
        return userRepository.save(user);
    }

    private FlashcardSet set(User owner, boolean isPublic, String title) {
        FlashcardSet set = new FlashcardSet();
        set.setOwner(owner);
        set.setPublic(isPublic);
        set.setTitle(title);
        set.setDescription("Integration test set");
        return setRepository.save(set);
    }

    private String bearer(User user) {
        return "Bearer " + jwtUtil.generateToken(user.getUsername());
    }
}
