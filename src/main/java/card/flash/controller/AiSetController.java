package card.flash.controller;

import card.flash.dto.AiSetGenerationRequest;
import card.flash.dto.AiSetGenerationResponse;
import card.flash.service.DeepSeekAiSetService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiSetController {

    private final DeepSeekAiSetService deepSeekAiSetService;

    public AiSetController(DeepSeekAiSetService deepSeekAiSetService) {
        this.deepSeekAiSetService = deepSeekAiSetService;
    }

    @PostMapping("/create-set")
    public AiSetGenerationResponse createSet(@Valid @RequestBody AiSetGenerationRequest request) {
        return deepSeekAiSetService.generateSet(request);
    }
}
