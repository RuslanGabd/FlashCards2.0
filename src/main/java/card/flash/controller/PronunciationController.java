package card.flash.controller;

import card.flash.dto.PronunciationResponse;
import card.flash.service.ForvoPronunciationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pronunciation")
public class PronunciationController {

    private final ForvoPronunciationService forvoPronunciationService;

    public PronunciationController(ForvoPronunciationService forvoPronunciationService) {
        this.forvoPronunciationService = forvoPronunciationService;
    }

    @GetMapping
    public PronunciationResponse getPronunciation(
            @RequestParam String word,
            @RequestParam(defaultValue = "en") String language,
            @RequestParam(defaultValue = "") String accent
    ) {
        return forvoPronunciationService.getPronunciation(word, language, accent);
    }
}
