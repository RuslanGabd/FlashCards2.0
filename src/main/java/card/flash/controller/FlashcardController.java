package card.flash.controller;

import card.flash.dto.FlashcardDto;
import card.flash.dto.FlashcardRequest;
import card.flash.entity.Flashcard;
import card.flash.entity.FlashcardSet;
import card.flash.exception.ResourceNotFoundException;
import card.flash.mapper.FlashcardMapper;
import card.flash.service.FlashcardService;
import card.flash.service.FlashcardSetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/flashcards")
@Validated
public class FlashcardController {

    private final FlashcardService flashcardService;
    private final FlashcardSetService flashcardSetService;

    public FlashcardController(FlashcardService flashcardService, FlashcardSetService flashcardSetService) {
        this.flashcardService = flashcardService;
        this.flashcardSetService = flashcardSetService;
    }

    @GetMapping("/set/{setId}")
    public List<FlashcardDto> getFlashcardsBySet(@PathVariable @Positive Long setId,
                                                 @AuthenticationPrincipal UserDetails userDetails) {
        FlashcardSet set = flashcardSetService.getById(setId)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard set not found"));
        if (!set.isPublic() && (userDetails == null || set.getOwner() == null
                || !userDetails.getUsername().equals(set.getOwner().getUsername()))) {
            throw new AccessDeniedException("This flashcard set is private");
        }

        return flashcardService.findBySet(set)
                .stream()
                .map(FlashcardMapper::toDto)
                .toList();
    }

    @PostMapping("/set/{setId}")
    public FlashcardDto addFlashcardToSet(@PathVariable @Positive Long setId,
                                          @Valid @RequestBody FlashcardRequest request,
                                          @AuthenticationPrincipal UserDetails userDetails) {
        FlashcardSet set = flashcardSetService.getById(setId)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard set not found"));
        requireOwner(set, userDetails);
        Flashcard card = new Flashcard();
        card.setTerm(request.term());
        card.setDefinition(request.definition());
        card.setExampleSentence(request.exampleSentence());
        card.setSet(set);

        return FlashcardMapper.toDto(flashcardService.save(card));
    }


    @DeleteMapping("/{id}")
    public void deleteFlashcard(@PathVariable @Positive Long id,
                                @AuthenticationPrincipal UserDetails userDetails) {
        Flashcard card = flashcardService.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard not found"));
        requireOwner(card.getSet(), userDetails);
        flashcardService.deleteById(id);
    }

    private void requireOwner(FlashcardSet set, UserDetails userDetails) {
        if (userDetails == null || set.getOwner() == null
                || !userDetails.getUsername().equals(set.getOwner().getUsername())) {
            throw new AccessDeniedException("You can modify only your own sets");
        }
    }
}
