package card.flash.controller;

import card.flash.dto.FlashcardDto;
import card.flash.entity.Flashcard;
import card.flash.entity.FlashcardSet;
import card.flash.mapper.FlashcardMapper;
import card.flash.service.FlashcardService;
import card.flash.service.FlashcardSetService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/flashcards")
public class FlashcardController {

    private final FlashcardService flashcardService;
    private final FlashcardSetService flashcardSetService;

    public FlashcardController(FlashcardService flashcardService, FlashcardSetService flashcardSetService) {
        this.flashcardService = flashcardService;
        this.flashcardSetService = flashcardSetService;
    }

    @GetMapping("/set/{setId}")
    public List<FlashcardDto> getFlashcardsBySet(@PathVariable Long setId) {
        FlashcardSet set = flashcardSetService.getById(setId)
                .orElseThrow(() -> new RuntimeException("Flashcard set not found"));

        return flashcardService.findBySet(set)
                .stream()
                .map(FlashcardMapper::toDto)
                .toList();
    }

    @PostMapping("/set/{setId}")
    public FlashcardDto addFlashcardToSet(@PathVariable Long setId, @RequestBody FlashcardDto dto) {
        FlashcardSet set = flashcardSetService.getById(setId)
                .orElseThrow(() -> new RuntimeException("Flashcard set not found"));
        Flashcard card = FlashcardMapper.toEntity(dto);
        card.setSet(set);

        return FlashcardMapper.toDto(flashcardService.save(card));
    }


    @DeleteMapping("/{id}")
    public void deleteFlashcard(@PathVariable Long id) {
        flashcardService.deleteById(id);
    }
}
