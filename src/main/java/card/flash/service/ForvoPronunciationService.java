package card.flash.service;

import card.flash.dto.PronunciationResponse;
import card.flash.entity.ForvoPronunciationCache;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Optional;

@Service
public class ForvoPronunciationService {

    private static final String LEADING_ENGLISH_PREPOSITION =
            "(?i)^(?:aboard|about|above|across|after|against|along|alongside|amid|amidst|among|amongst|around|as|at|before|behind|below|beneath|beside|between|beyond|by|concerning|considering|despite|down|during|except|excluding|following|for|from|in|including|inside|into|like|minus|near|notwithstanding|of|off|on|onto|opposite|out|outside|over|past|per|plus|regarding|round|save|since|than|through|throughout|till|to|toward|towards|under|underneath|unlike|until|up|upon|versus|via|with|within|without|worth)\\s+";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper;
    private final ForvoPronunciationCacheService cacheService;
    private final String apiKey;
    private final String apiBaseUrl;
    private final Duration positiveCacheTtl;
    private final Duration negativeCacheTtl;

    public ForvoPronunciationService(
            ObjectMapper objectMapper,
            ForvoPronunciationCacheService cacheService,
            @Value("${forvo.api-key:}") String apiKey,
            @Value("${forvo.api-base-url:https://apifree.forvo.com}") String apiBaseUrl,
            @Value("${forvo.cache.positive-ttl:PT720H}") Duration positiveCacheTtl,
            @Value("${forvo.cache.negative-ttl:PT24H}") Duration negativeCacheTtl
    ) {
        this.objectMapper = objectMapper;
        this.cacheService = cacheService;
        this.apiKey = apiKey;
        this.apiBaseUrl = apiBaseUrl;
        this.positiveCacheTtl = positiveCacheTtl;
        this.negativeCacheTtl = negativeCacheTtl;
    }

    public PronunciationResponse getPronunciation(String word, String language, String accent) {
        String normalizedWord = normalizeWord(word);
        String normalizedLanguage = normalizeLanguage(language);
        String country = normalizeCountry(normalizedLanguage, accent);

        if (normalizedWord.isBlank()) {
            return emptyResult(normalizedWord, normalizedLanguage);
        }

        try {
            PronunciationResponse result = findPronunciation(normalizedWord, normalizedLanguage, country);
            if (result.audioUrl() != null) {
                return result;
            }

            String baseWord = removeLeadingEnglishPreposition(normalizedWord, normalizedLanguage);
            if (!baseWord.equals(normalizedWord)) {
                PronunciationResponse baseWordResult = findPronunciation(baseWord, normalizedLanguage, country);
                if (baseWordResult.audioUrl() != null) {
                    return new PronunciationResponse(
                            normalizedWord,
                            normalizedLanguage,
                            baseWordResult.audioUrl(),
                            baseWordResult.source() + "-base-word"
                    );
                }
            }
            return emptyResult(normalizedWord, normalizedLanguage);
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return emptyResult(normalizedWord, normalizedLanguage);
        }
    }

    private PronunciationResponse findPronunciation(String word, String language, String country)
            throws IOException, InterruptedException {
        String cacheWord = normalizeCacheWord(word);
        Optional<ForvoPronunciationCache> cached = cacheService.find(cacheWord, language, country);
        if (cached.isPresent()) {
            ForvoPronunciationCache entry = cached.get();
            return new PronunciationResponse(
                    word,
                    language,
                    entry.getAudioUrl(),
                    entry.getSource() + "-cache"
            );
        }

        if (apiKey == null || apiKey.isBlank()) {
            return emptyResult(word, language);
        }

        PronunciationResponse result;
        if (!country.isBlank()) {
            PronunciationResponse countryResult = requestPronunciation(
                    buildPronunciationUri(word, language, "word-pronunciations", country),
                    word,
                    language,
                    "forvo-" + country.toLowerCase(Locale.ROOT)
            );
            if (countryResult.audioUrl() != null) {
                result = countryResult;
                storeCache(cacheWord, language, country, result);
                return result;
            }
        }

        result = requestPronunciation(
                buildPronunciationUri(word, language, "standard-pronunciation", ""),
                word,
                language,
                "forvo"
        );
        storeCache(cacheWord, language, country, result);
        return result;
    }

    private void storeCache(String cacheWord, String language, String country, PronunciationResponse result) {
        Duration ttl = result.audioUrl() == null ? negativeCacheTtl : positiveCacheTtl;
        try {
            cacheService.store(cacheWord, language, country, result.audioUrl(), result.source(), ttl);
        } catch (DataIntegrityViolationException ignored) {
            // A concurrent request may have inserted the same cache key first.
        }
    }

    private String removeLeadingEnglishPreposition(String word, String language) {
        if (!"en".equals(language)) return word;
        return word.replaceFirst(LEADING_ENGLISH_PREPOSITION, "").trim();
    }

    private PronunciationResponse requestPronunciation(
            URI uri,
            String word,
            String language,
            String source
    ) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .timeout(Duration.ofSeconds(20))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IOException("Forvo API returned HTTP " + response.statusCode());
        }
        return parseResponse(word, language, response.body(), source);
    }

    private URI buildPronunciationUri(String word, String language, String action, String country) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(apiBaseUrl)
                .pathSegment(
                        "key", apiKey,
                        "format", "json",
                        "action", action,
                        "word", word,
                        "language", language
                );
        if (!country.isBlank()) {
            builder.pathSegment("country", country);
        }
        if ("word-pronunciations".equals(action)) {
            builder.pathSegment("order", "rate-desc", "limit", "1");
        }
        return builder.build()
                .encode()
                .toUri();
    }

    private PronunciationResponse parseResponse(String word, String language, String body, String source) throws IOException {
        JsonNode root = objectMapper.readTree(body);
        JsonNode items = root.path("items");
        if (!items.isArray() || items.isEmpty()) {
            return emptyResult(word, language);
        }

        JsonNode firstItem = items.path(0);
        String audioUrl = firstItem.path("pathmp3").asText("");
        if (audioUrl.isBlank()) {
            audioUrl = firstItem.path("pathogg").asText("");
        }

        if (audioUrl.isBlank()) {
            return emptyResult(word, language);
        }

        return new PronunciationResponse(word, language, audioUrl, source);
    }

    private String normalizeWord(String word) {
        return word == null ? "" : word.trim();
    }

    private String normalizeCacheWord(String word) {
        return normalizeWord(word).toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String normalizeLanguage(String language) {
        String value = language == null ? "" : language.trim().toLowerCase(Locale.ROOT);
        if (value.startsWith("ru")) {
            return "ru";
        }
        if (value.startsWith("fr")) {
            return "fr";
        }
        return "en";
    }

    private String normalizeCountry(String language, String accent) {
        if (!"en".equals(language)) {
            return "";
        }

        String value = accent == null ? "" : accent.trim().toLowerCase(Locale.ROOT);
        return switch (value) {
            case "uk", "gb", "british" -> "GBR";
            case "us", "usa", "american" -> "USA";
            default -> "";
        };
    }

    private PronunciationResponse emptyResult(String word, String language) {
        return new PronunciationResponse(word, language, null, "browser");
    }
}
