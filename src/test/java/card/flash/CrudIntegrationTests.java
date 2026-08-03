package card.flash;

import card.flash.entity.User;
import card.flash.repository.FlashcardRepository;
import card.flash.repository.FlashcardSetRepository;
import card.flash.repository.UserRepository;
import card.flash.security.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CrudIntegrationTests {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserRepository userRepository;
    @Autowired FlashcardSetRepository setRepository;
    @Autowired FlashcardRepository cardRepository;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtUtil jwtUtil;

    @Test
    void ownerCanCreateUpdateReadAndDeleteSetAndCards() throws Exception {
        User owner = user("crud_owner");
        String bearer = "Bearer " + jwtUtil.generateToken(owner.getUsername());

        String createResponse = mockMvc.perform(post("/api/sets")
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Created set","description":"Initial","public":false,
                                 "cards":[{"term":"one","definition":"один"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Created set"))
                .andReturn().getResponse().getContentAsString();
        long setId = objectMapper.readTree(createResponse).path("id").asLong();
        assertThat(setRepository.findById(setId)).isPresent();

        mockMvc.perform(put("/api/sets/{id}", setId)
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Updated set","description":"Updated","public":true,
                                 "cards":[{"term":"two","definition":"два"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated set"));

        String cardResponse = mockMvc.perform(post("/api/flashcards/set/{id}", setId)
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"term\":\"three\",\"definition\":\"три\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.term").value("three"))
                .andReturn().getResponse().getContentAsString();
        JsonNode cardJson = objectMapper.readTree(cardResponse);
        long cardId = cardJson.path("id").asLong();

        mockMvc.perform(put("/api/annotations/card/{id}", cardId)
                        .header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "drawingData", "[{\"tool\":\"pencil\",\"points\":[{\"x\":0.1,\"y\":0.2}]}]"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flashcardId").value(cardId))
                .andExpect(jsonPath("$.drawingData").value(org.hamcrest.Matchers.containsString("pencil")));

        mockMvc.perform(get("/api/annotations/card/{id}", cardId)
                        .header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.drawingData").value(org.hamcrest.Matchers.containsString("pencil")));

        mockMvc.perform(get("/api/flashcards/set/{id}", setId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.term == 'two')]").exists())
                .andExpect(jsonPath("$[?(@.term == 'three')]").exists());

        mockMvc.perform(delete("/api/flashcards/{id}", cardId)
                        .header("Authorization", bearer))
                .andExpect(status().isOk());
        assertThat(cardRepository.findById(cardId)).isEmpty();

        mockMvc.perform(delete("/api/sets/{id}", setId)
                        .header("Authorization", bearer))
                .andExpect(status().isNoContent());
        assertThat(setRepository.findById(setId)).isEmpty();
    }

    private User user(String username) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(username + "@example.com");
        user.setPassword(passwordEncoder.encode("password123"));
        return userRepository.save(user);
    }
}
