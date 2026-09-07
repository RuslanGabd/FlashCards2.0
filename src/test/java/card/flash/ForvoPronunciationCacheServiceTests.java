package card.flash;

import card.flash.entity.ForvoPronunciationCache;
import card.flash.repository.ForvoPronunciationCacheRepository;
import card.flash.service.ForvoPronunciationCacheService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(ForvoPronunciationCacheService.class)
class ForvoPronunciationCacheServiceTests {

    @Autowired
    private ForvoPronunciationCacheService cacheService;

    @Autowired
    private ForvoPronunciationCacheRepository repository;

    @Test
    void storesAndReusesPronunciationByWordLanguageAndAccent() {
        cacheService.store(
                "sequence",
                "en",
                "USA",
                "https://audio.example/sequence.mp3",
                "forvo-usa",
                Duration.ofDays(30)
        );

        ForvoPronunciationCache cached = cacheService.find("sequence", "en", "USA").orElseThrow();

        assertThat(cached.getAudioUrl()).isEqualTo("https://audio.example/sequence.mp3");
        assertThat(cached.getSource()).isEqualTo("forvo-usa");
    }

    @Test
    void updatesExistingEntryAndCanCacheMissingPronunciation() {
        cacheService.store("missing phrase", "en", "GBR", "https://audio.example/old.mp3",
                "forvo-gbr", Duration.ofDays(30));
        cacheService.store("missing phrase", "en", "GBR", null,
                "browser", Duration.ofDays(1));

        ForvoPronunciationCache cached = cacheService.find("missing phrase", "en", "GBR").orElseThrow();

        assertThat(cached.getAudioUrl()).isNull();
        assertThat(repository.count()).isOne();
    }
}
