package card.flash.controller;

import card.flash.dto.PronunciationResponse;
import card.flash.service.ForvoPronunciationService;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pronunciation")
@Validated
public class PronunciationController {

    private final ForvoPronunciationService forvoPronunciationService;

    public PronunciationController(ForvoPronunciationService forvoPronunciationService) {
        this.forvoPronunciationService = forvoPronunciationService;
    }

    @GetMapping
    public PronunciationResponse getPronunciation(
            @RequestParam @Size(min = 1, max = 100) String word,
            @RequestParam(defaultValue = "en") @Pattern(regexp = "(?i)en|ru") String language,
            @RequestParam(defaultValue = "") @Pattern(regexp = "(?i)|uk|gb|british|us|usa|american") String accent
    ) {
        return forvoPronunciationService.getPronunciation(word, language, accent);
    }
}
