package card.flash;

import card.flash.entity.Flashcard;
import card.flash.entity.FlashcardSet;
import card.flash.entity.User;
import card.flash.repository.FlashcardRepository;
import card.flash.repository.FlashcardSetRepository;
import card.flash.repository.UserRepository;
import card.flash.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class FlashcardLimitTests {
    @Autowired MockMvc mvc;
    @Autowired FlashcardSetRepository sets;
    @Autowired FlashcardRepository cards;
    @Autowired UserRepository users;
    @Autowired JwtUtil jwt;
    @Autowired ObjectMapper json;
    User owner;
    String bearer;

    @BeforeEach void setup() {
        owner = new User();
        owner.setUsername("limits_" + UUID.randomUUID().toString().substring(0, 8));
        owner.setEmail(owner.getUsername() + "@example.invalid");
        owner.setPassword("unused-test-hash");
        owner = users.save(owner);
        bearer = "Bearer " + jwt.generateToken(owner.getUsername());
    }
    @AfterEach void cleanup() {
        sets.deleteAll(sets.findByOwner(owner));
        users.deleteById(owner.getId());
    }
    FlashcardSet collection(int count, String image) {
        FlashcardSet set = new FlashcardSet(); set.setOwner(owner); set.setTitle("Original");
        for (int i = 0; i < count; i++) {
            Flashcard card = new Flashcard(); card.setTerm("term " + i); card.setDefinition("meaning");
            card.setSet(set); card.setPosition(i); card.setImage(image); set.getCards().add(card);
        }
        return sets.saveAndFlush(set);
    }
    @Test void nullElementsAreBadRequestsAndDoNotChangeExistingData() throws Exception {
        String body = "{\"title\":\"Changed\",\"cards\":[null]}";
        mvc.perform(post("/api/sets").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        assertThat(sets.findByOwner(owner)).isEmpty();
        FlashcardSet set = collection(1, "");
        mvc.perform(put("/api/sets/{id}", set.getId()).header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        assertThat(sets.findById(set.getId()).orElseThrow().getTitle()).isEqualTo("Original");
        assertThat(cards.findBySetOrderByPositionAscIdAsc(set)).hasSize(1);
    }
    @Test void singleCardEndpointCannotExceedTheCollectionLimit() throws Exception {
        FlashcardSet set = collection(500, "");
        mvc.perform(post("/api/flashcards/set/{id}", set.getId()).header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"term\":\"extra\",\"definition\":\"extra\"}"))
                .andExpect(status().isBadRequest());
        assertThat(cards.findBySetOrderByPositionAscIdAsc(set)).hasSize(500);
    }
    @Test void imageBudgetIsSharedByAppendAndReplaceOperations() throws Exception {
        byte[] png = Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6lpQAAAAASUVORK5CYII=");
        String image = "data:image/png;base64," + Base64.getEncoder().encodeToString(Arrays.copyOf(png, 180_000));
        FlashcardSet set = collection(8, image);
        String card = json.writeValueAsString(Map.of("term", "extra", "definition", "extra", "image", image));
        mvc.perform(post("/api/flashcards/set/{id}", set.getId()).header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content(card)).andExpect(status().isBadRequest());
        String replacement = json.writeValueAsString(Map.of("title", "Changed", "cards",
                Collections.nCopies(9, Map.of("term", "term", "definition", "meaning", "image", image))));
        mvc.perform(put("/api/sets/{id}", set.getId()).header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content(replacement)).andExpect(status().isBadRequest());
        assertThat(cards.findBySetOrderByPositionAscIdAsc(set)).hasSize(8);
        assertThat(sets.findById(set.getId()).orElseThrow().getTitle()).isEqualTo("Original");
    }
    @Test void concurrentAppendsCannotBothTakeTheLastAvailablePlace() throws Exception {
        FlashcardSet set = collection(499, "");
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Callable<Integer> append = () -> {
                start.await();
                return mvc.perform(post("/api/flashcards/set/{id}", set.getId()).header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"term\":\"extra\",\"definition\":\"extra\"}"))
                        .andReturn().getResponse().getStatus();
            };
            Future<Integer> first = executor.submit(append), second = executor.submit(append);
            start.countDown();
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 400);
        }
        assertThat(cards.findBySetOrderByPositionAscIdAsc(set)).hasSize(500);
    }
}
