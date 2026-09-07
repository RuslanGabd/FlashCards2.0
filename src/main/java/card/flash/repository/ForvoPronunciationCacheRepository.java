package card.flash.repository;

import card.flash.entity.ForvoPronunciationCache;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ForvoPronunciationCacheRepository extends JpaRepository<ForvoPronunciationCache, Long> {

    Optional<ForvoPronunciationCache> findByCacheWordAndLanguageAndAccent(
            String cacheWord,
            String language,
            String accent
    );
}
