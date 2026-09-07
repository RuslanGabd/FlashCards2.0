// src/main/java/card/flash/controller/FlashcardSetController.java
package card.flash.controller;

import card.flash.entity.Flashcard;
import card.flash.entity.FlashcardSet;
import card.flash.entity.User;
import card.flash.dto.FlashcardRequest;
import card.flash.dto.FlashcardSetRequest;
import card.flash.exception.ResourceNotFoundException;
import card.flash.mapper.FlashcardSetMapper;
import card.flash.service.FlashcardSetService;
import card.flash.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import card.flash.dto.FlashcardSetDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;

import java.util.*;

@RestController
@RequestMapping("/api/sets")
@Validated
public class FlashcardSetController {

    private final FlashcardSetService flashcardSetService;
    private final UserService userService;

    public FlashcardSetController(FlashcardSetService flashcardSetService,
                                  UserService userService) {
        this.flashcardSetService = flashcardSetService;
        this.userService = userService;
    }

    /** GET /api/sets/public → List of all public sets */
//    @GetMapping("/public")
//    public ResponseEntity<List<FlashcardSet>> getPublicSets() {
//        List<FlashcardSet> sets = flashcardSetService.getAllPublicSets();
//        return ResponseEntity.ok(sets);
//    }


    @GetMapping("/public")
    public ResponseEntity<List<FlashcardSetDto>> getPublicSets() {
        List<FlashcardSet> sets = flashcardSetService.getAllPublicSets();

        List<FlashcardSetDto> dtoList = sets.stream()
                .map(FlashcardSetMapper::toDto)
                .toList();

        return ResponseEntity.ok(dtoList);
    }

    @GetMapping("/me")
    public ResponseEntity<List<FlashcardSetDto>> getMySets(@AuthenticationPrincipal UserDetails userDetails) {
        User owner = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<FlashcardSetDto> dtoList = flashcardSetService.getSetsByOwner(owner).stream()
                .map(FlashcardSetMapper::toDto)
                .toList();

        return ResponseEntity.ok(dtoList);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FlashcardSetDto> getOwnedSet(@PathVariable @Positive Long id,
                                                       @AuthenticationPrincipal UserDetails userDetails) {
        FlashcardSet set = flashcardSetService.getById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard set not found"));
        if (set.getOwner() == null || userDetails == null
                || !userDetails.getUsername().equals(set.getOwner().getUsername())) {
            throw new AccessDeniedException("You can edit only your own sets");
        }
        return ResponseEntity.ok(FlashcardSetMapper.toDto(set));
    }

    @GetMapping("/{id}/study")
    public ResponseEntity<FlashcardSetDto> getSetForStudy(
            @PathVariable @Positive Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        FlashcardSet set = flashcardSetService.getById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard set not found"));
        boolean owner = set.getOwner() != null && userDetails != null
                && userDetails.getUsername().equals(set.getOwner().getUsername());
        if (!set.isPublic() && !owner) {
            throw new AccessDeniedException("This set is private");
        }
        return ResponseEntity.ok(FlashcardSetMapper.toDto(set));
    }

    /** GET /api/sets/user/{username} → All sets owned by this username */
    @GetMapping("/user/{username}")
    public ResponseEntity<?> getSetsByUser(
            @PathVariable @Size(min = 3, max = 50) @Pattern(regexp = "[A-Za-z0-9._-]+") String username) {
        User owner = userService.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<FlashcardSet> sets = flashcardSetService.getSetsByOwner(owner);
        return ResponseEntity.ok(sets.stream().map(FlashcardSetMapper::toDto).toList());
    }

    /** POST /api/sets → Create a new set.
     *  Body: JSON { title, description, isPublic, owner: { id } }
     */

    @PostMapping
    public ResponseEntity<FlashcardSetDto> createSet(@Valid @RequestBody FlashcardSetRequest request,
                                                     @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        User owner = userService.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        FlashcardSet set = new FlashcardSet();
        applyRequest(set, request);
        set.setOwner(owner);

        FlashcardSet saved = flashcardSetService.save(set);
        return ResponseEntity.ok(FlashcardSetMapper.toDto(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSet(@PathVariable @Positive Long id,
                                       @Valid @RequestBody FlashcardSetRequest request,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        FlashcardSet existingSet = flashcardSetService.getById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard set not found"));

        String username = userDetails.getUsername();
        if (existingSet.getOwner() == null || !username.equals(existingSet.getOwner().getUsername())) {
            throw new AccessDeniedException("You can edit only your own sets");
        }

        applyRequest(existingSet, request);

        FlashcardSet saved = flashcardSetService.save(existingSet);
        return ResponseEntity.ok(FlashcardSetMapper.toDto(saved));
    }



    /** DELETE /api/sets/{id} → Delete a set by ID */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSet(@PathVariable @Positive Long id,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        FlashcardSet set = flashcardSetService.getById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard set not found"));
        if (set.getOwner() == null || !userDetails.getUsername().equals(set.getOwner().getUsername())) {
            throw new AccessDeniedException("You can delete only your own sets");
        }
        flashcardSetService.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private void applyRequest(FlashcardSet set, FlashcardSetRequest request) {
        set.setTitle(request.title());
        set.setDescription(request.description());
        set.setPublic(request.publicSet());
        if (request.language() != null || set.getLanguage() == null || set.getLanguage().isBlank()) {
            set.setLanguage(normalizeLanguage(request.language()));
        }

        if (request.cards() == null) {
            set.getCards().clear();
            return;
        }

        Map<String, Flashcard> existingByClientId = new HashMap<>();
        set.getCards().stream()
                .filter(card -> card.getClientId() != null && !card.getClientId().isBlank())
                .forEach(card -> existingByClientId.put(card.getClientId(), card));

        Set<Flashcard> retainedCards = new HashSet<>();
        Set<String> requestClientIds = new HashSet<>();
        for (FlashcardRequest cardRequest : request.cards()) {
            String clientId = cardRequest.clientId() == null
                    ? UUID.randomUUID().toString()
                    : cardRequest.clientId();
            if (!requestClientIds.add(clientId)) {
                throw new IllegalArgumentException("Duplicate card clientId");
            }

            Flashcard card = existingByClientId.getOrDefault(clientId, new Flashcard());
            card.setClientId(clientId);
            card.setTerm(cardRequest.term());
            card.setDefinition(cardRequest.definition());
            card.setExampleSentence(cardRequest.exampleSentence());
            card.setSet(set);
            retainedCards.add(card);
            if (card.getId() == null) {
                set.getCards().add(card);
            }
        }
        set.getCards().removeIf(card -> !retainedCards.contains(card));
    }

    private String normalizeLanguage(String language) {
        return "fr".equalsIgnoreCase(language) ? "fr" : "en";
    }
}
