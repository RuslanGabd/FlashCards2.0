package card.flash.controller;

import card.flash.dto.FlashcardAnnotationDto;
import card.flash.dto.FlashcardAnnotationRequest;
import card.flash.entity.Flashcard;
import card.flash.entity.User;
import card.flash.exception.ResourceNotFoundException;
import card.flash.service.FlashcardAnnotationService;
import card.flash.service.FlashcardService;
import card.flash.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/annotations")
@Validated
public class FlashcardAnnotationController {

    private final FlashcardAnnotationService annotationService;
    private final FlashcardService flashcardService;
    private final UserService userService;

    public FlashcardAnnotationController(FlashcardAnnotationService annotationService,
                                         FlashcardService flashcardService,
                                         UserService userService) {
        this.annotationService = annotationService;
        this.flashcardService = flashcardService;
        this.userService = userService;
    }

    @GetMapping("/card/{cardId}")
    public FlashcardAnnotationDto get(@PathVariable @Positive Long cardId,
                                      @AuthenticationPrincipal UserDetails userDetails) {
        User user = requireUser(userDetails);
        Flashcard card = requireVisibleCard(cardId, user);
        String drawingData = annotationService.find(user, card)
                .map(annotation -> annotation.getDrawingData())
                .orElse("[]");
        return new FlashcardAnnotationDto(cardId, drawingData);
    }

    @PutMapping("/card/{cardId}")
    public FlashcardAnnotationDto save(@PathVariable @Positive Long cardId,
                                       @Valid @RequestBody FlashcardAnnotationRequest request,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        User user = requireUser(userDetails);
        Flashcard card = requireVisibleCard(cardId, user);
        String drawingData = request.drawingData().isBlank() ? "[]" : request.drawingData();
        annotationService.save(user, card, drawingData);
        return new FlashcardAnnotationDto(cardId, drawingData);
    }

    private User requireUser(UserDetails userDetails) {
        if (userDetails == null) {
            throw new AccessDeniedException("Authentication is required");
        }
        return userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Flashcard requireVisibleCard(Long cardId, User user) {
        Flashcard card = flashcardService.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard not found"));
        boolean owner = card.getSet().getOwner() != null
                && user.getUsername().equals(card.getSet().getOwner().getUsername());
        if (!card.getSet().isPublic() && !owner) {
            throw new AccessDeniedException("This flashcard is private");
        }
        return card;
    }
}
