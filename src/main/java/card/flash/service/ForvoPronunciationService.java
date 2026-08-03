package card.flash.service;

import card.flash.dto.PronunciationResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

@Service
public class ForvoPronunciationService {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String apiBaseUrl;

    public ForvoPronunciationService(
            ObjectMapper objectMapper,
            @Value("${forvo.api-key:}") String apiKey,
            @Value("${forvo.api-base-url:https://apifree.forvo.com}") String apiBaseUrl
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.apiBaseUrl = apiBaseUrl;
    }

    public PronunciationResponse getPronunciation(String word, String language, String accent) {
        String normalizedWord = normalizeWord(word);
        String normalizedLanguage = normalizeLanguage(language);
        String country = normalizeCountry(normalizedLanguage, accent);

        if (normalizedWord.isBlank() || apiKey == null || apiKey.isBlank()) {
            return emptyResult(normalizedWord, normalizedLanguage);
        }

        try {
            if (!country.isBlank()) {
                PronunciationResponse countryResult = requestPronunciation(
                        buildPronunciationUri(normalizedWord, normalizedLanguage, "word-pronunciations", country),
                        normalizedWord,
                        normalizedLanguage,
                        "forvo-" + country.toLowerCase(Locale.ROOT)
                );
                if (countryResult.audioUrl() != null) {
                    return countryResult;
                }
            }

            return requestPronunciation(
                    buildPronunciationUri(normalizedWord, normalizedLanguage, "standard-pronunciation", ""),
                    normalizedWord,
                    normalizedLanguage,
                    "forvo"
            );
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return emptyResult(normalizedWord, normalizedLanguage);
        }
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
            return emptyResult(word, language);
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

    private String normalizeLanguage(String language) {
        String value = language == null ? "" : language.trim().toLowerCase(Locale.ROOT);
        if (value.startsWith("ru")) {
            return "ru";
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
