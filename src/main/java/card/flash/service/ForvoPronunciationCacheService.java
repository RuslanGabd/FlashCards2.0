package card.flash.service;

import card.flash.entity.ForvoPronunciationCache;
import card.flash.repository.ForvoPronunciationCacheRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class ForvoPronunciationCacheService {

    private final ForvoPronunciationCacheRepository repository;

    public ForvoPronunciationCacheService(ForvoPronunciationCacheRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Optional<ForvoPronunciationCache> find(String cacheWord, String language, String accent) {
        LocalDateTime now = LocalDateTime.now();
        return repository.findByCacheWordAndLanguageAndAccent(cacheWord, language, accent)
                .filter(entry -> entry.getExpiresAt().isAfter(now));
    }

    @Transactional
    public void store(
            String cacheWord,
            String language,
            String accent,
            String audioUrl,
            String source,
            Duration ttl
    ) {
        ForvoPronunciationCache entry = repository
                .findByCacheWordAndLanguageAndAccent(cacheWord, language, accent)
                .orElseGet(ForvoPronunciationCache::new);
        entry.setCacheWord(cacheWord);
        entry.setLanguage(language);
        entry.setAccent(accent);
        entry.setAudioUrl(audioUrl);
        entry.setSource(source);
        entry.setExpiresAt(LocalDateTime.now().plus(ttl));
        repository.save(entry);
    }
}
