package card.flash;

import card.flash.entity.User;
import card.flash.repository.UserRepository;
import card.flash.repository.FlashcardSetRepository;
import card.flash.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ImagePersistenceTests {
    static final String PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6lpQAAAAASUVORK5CYII=";
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired FlashcardSetRepository sets;
    @Autowired JwtUtil jwt;
    @Autowired ObjectMapper json;
    User owner;
    String bearer;
    @BeforeEach void setup() {
        owner = new User(); owner.setUsername("image_" + UUID.randomUUID().toString().substring(0, 8));
        owner.setEmail(owner.getUsername() + "@example.invalid"); owner.setPassword("unused-test-hash");
        owner = users.save(owner); bearer = "Bearer " + jwt.generateToken(owner.getUsername());
    }
    @AfterEach void cleanup() { sets.deleteAll(sets.findByOwner(owner)); users.deleteById(owner.getId()); }
    String payload(String title, String image) throws Exception {
        return json.writeValueAsString(Map.of("title", title, "public", false, "language", "fr",
                "diagram", Map.of("name", "diagram.png", "src", PNG),
                "cards", List.of(Map.of("term", "bonjour", "definition", "привет", "image", image))));
    }
    @Test void imagesAndDiagramSurviveAnIndependentRead() throws Exception {
        String body = mvc.perform(post("/api/sets").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(payload("Image set", PNG)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).path("id").asLong();
        mvc.perform(get("/api/sets/{id}", id).header("Authorization", bearer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.diagram.src").value(PNG));
        mvc.perform(get("/api/flashcards/set/{id}", id).header("Authorization", bearer))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].image").value(PNG));
    }
    @Test void unsafeImagesAreRejected() throws Exception {
        mvc.perform(post("/api/sets").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                        .content(payload("Unsafe", "data:image/svg+xml;base64,PHN2Zz4=")))
                .andExpect(status().isBadRequest());
    }
    @Test void invalidUpdateDoesNotPartiallyOverwriteTheSet() throws Exception {
        String body = mvc.perform(post("/api/sets").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(payload("Original", PNG)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(body).path("id").asLong();
        mvc.perform(put("/api/sets/{id}", id).header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(payload("Changed", "https://invalid.example/image.svg")))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/sets/{id}", id).header("Authorization", bearer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Original"));
    }
}
