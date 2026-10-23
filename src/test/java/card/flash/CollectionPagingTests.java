package card.flash;

import card.flash.entity.*;
import card.flash.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CollectionPagingTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired FlashcardSetRepository sets;
    @Test void paginatedSearchExcludesPrivateSetsAndReportsRemainingPages() throws Exception {
        User user = new User(); user.setUsername("paging_owner"); user.setEmail("paging@example.invalid"); user.setPassword("unused");
        user = users.saveAndFlush(user);
        for (int i = 0; i < 4; i++) {
            var set = new FlashcardSet(); set.setOwner(user); set.setTitle("UniquePagingCollection " + i); set.setPublic(i < 3);
            sets.saveAndFlush(set);
        }
        mvc.perform(get("/api/sets/public").param("q", "UniquePagingCollection").param("size", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
                .andExpect(header().string("X-Has-More", "true")).andExpect(header().string("X-Total-Count", "3"));
        mvc.perform(get("/api/sets/public").param("q", "UniquePagingCollection").param("size", "2").param("page", "1"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(header().string("X-Has-More", "false"));
        mvc.perform(get("/api/sets/public").param("size", "101")).andExpect(status().isBadRequest());
    }
}
