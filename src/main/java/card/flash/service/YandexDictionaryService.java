package card.flash.service;

import card.flash.dto.DictionaryWordDto;
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
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

@Service
public class YandexDictionaryService {

    private static final int MAX_ALTERNATIVES = 10;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String lookupUrl;
    private final Duration requestBudget;

    public YandexDictionaryService(
            ObjectMapper objectMapper,
            @Value("${yandex.dictionary.api-key:}") String apiKey,
            @Value("${yandex.dictionary.lookup-url:https://dictionary.yandex.net/api/v1/dicservice.json/lookup}") String lookupUrl,
            @Value("${yandex.dictionary.request-budget:PT15S}") Duration requestBudget
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.lookupUrl = lookupUrl;
        this.requestBudget = requestBudget;
        if (requestBudget.isZero() || requestBudget.isNegative()) throw new IllegalArgumentException("Dictionary budget must be positive");
    }

    public List<DictionaryWordDto> lookup(List<String> words, String lang) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("YANDEX_DICTIONARY_API_KEY is not configured");
        }

        String direction = normalizeDirection(lang);
        List<String> normalized = words.stream().filter(Objects::nonNull).map(String::trim)
                .filter(word -> !word.isBlank()).distinct().limit(50).toList();
        long deadline = System.nanoTime() + requestBudget.toNanos();
        List<DictionaryWordDto> results = new ArrayList<>();
        for (String word : normalized) {
            long remaining = deadline - System.nanoTime();
            if (remaining <= 0) throw new IllegalStateException("Dictionary request timed out. Try fewer words.");
            results.add(lookupWord(word, direction, Duration.ofNanos(remaining)));
        }
        return results;
    }

    private DictionaryWordDto lookupWord(String word, String lang, Duration remaining) {
        try {
            var request = HttpRequest.newBuilder().uri(buildLookupUri(word, lang))
                    .timeout(remaining.compareTo(Duration.ofSeconds(5)) < 0 ? remaining : Duration.ofSeconds(5))
                    .GET().build();
            var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) throw new IllegalStateException("Dictionary service is unavailable. Please try again later.");
            return parseResponse(word, response.body());
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new IllegalStateException("Dictionary request failed. Please try again.", exception);
        }
    }

    private URI buildLookupUri(String word, String lang) {
        return UriComponentsBuilder.fromHttpUrl(lookupUrl)
                .queryParam("key", apiKey)
                .queryParam("lang", lang)
                .queryParam("text", word)
                .build()
                .encode()
                .toUri();
    }

    private String normalizeDirection(String lang) {
        return switch (lang == null ? "" : lang.toLowerCase()) {
            case "ru-en" -> "ru-en";
            case "fr-ru" -> "fr-ru";
            case "ru-fr" -> "ru-fr";
            default -> "en-ru";
        };
    }

    private DictionaryWordDto parseResponse(String word, String body) throws IOException {
        JsonNode root = objectMapper.readTree(body);
        JsonNode definitions = root.path("def");
        if (!definitions.isArray() || definitions.isEmpty()) {
            return emptyResult(word);
        }

        LinkedHashSet<String> translations = new LinkedHashSet<>();
        LinkedHashSet<String> partsOfSpeech = new LinkedHashSet<>();
        String transcription = "";

        for (JsonNode definition : definitions) {
            addText(partsOfSpeech, definition.path("pos").asText(""));
            if (transcription.isBlank()) {
                transcription = definition.path("ts").asText("");
            }

            JsonNode translationNodes = definition.path("tr");
            if (!translationNodes.isArray()) continue;

            for (JsonNode translationNode : translationNodes) {
                addText(translations, translationNode.path("text").asText(""));
                JsonNode synonyms = translationNode.path("syn");
                if (synonyms.isArray()) {
                    for (JsonNode synonym : synonyms) {
                        addText(translations, synonym.path("text").asText(""));
                    }
                }
            }
        }

        List<String> alternatives = new ArrayList<>(translations).stream()
                .limit(MAX_ALTERNATIVES)
                .toList();
        String primary = alternatives.isEmpty() ? null : alternatives.get(0);

        return new DictionaryWordDto(
                word,
                primary,
                alternatives,
                String.join(" / ", partsOfSpeech),
                transcription
        );
    }

    private void addText(LinkedHashSet<String> values, String value) {
        if (value != null && !value.isBlank()) {
            values.add(value);
        }
    }

    private DictionaryWordDto emptyResult(String word) {
        return new DictionaryWordDto(word, null, List.of(), "", "");
    }
}
