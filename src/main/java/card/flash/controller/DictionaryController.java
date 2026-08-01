package card.flash.controller;

import card.flash.dto.DictionaryLookupRequest;
import card.flash.dto.DictionaryLookupResponse;
import card.flash.service.YandexDictionaryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dictionary")
public class DictionaryController {

    private final YandexDictionaryService yandexDictionaryService;

    public DictionaryController(YandexDictionaryService yandexDictionaryService) {
        this.yandexDictionaryService = yandexDictionaryService;
    }

    @PostMapping("/lookup")
    public DictionaryLookupResponse lookup(@Valid @RequestBody DictionaryLookupRequest request) {
        return new DictionaryLookupResponse(yandexDictionaryService.lookup(request.words(), request.lang()));
    }
}
