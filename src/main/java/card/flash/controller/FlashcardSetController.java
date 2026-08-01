// src/main/java/card/flash/controller/FlashcardSetController.java
package card.flash.controller;

import card.flash.entity.Flashcard;
import card.flash.entity.FlashcardSet;
import card.flash.entity.User;
import card.flash.mapper.FlashcardSetMapper;
import card.flash.service.FlashcardSetService;
import card.flash.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import card.flash.dto.FlashcardSetDto;

import java.util.List;

@RestController
@RequestMapping("/api/sets")
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
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<FlashcardSetDto> dtoList = flashcardSetService.getSetsByOwner(owner).stream()
                .map(FlashcardSetMapper::toDto)
                .toList();

        return ResponseEntity.ok(dtoList);
    }

    /** GET /api/sets/user/{username} → All sets owned by this username */
    @GetMapping("/user/{username}")
    public ResponseEntity<?> getSetsByUser(@PathVariable String username) {
        User owner = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<FlashcardSet> sets = flashcardSetService.getSetsByOwner(owner);
        return ResponseEntity.ok(sets.stream().map(FlashcardSetMapper::toDto).toList());
    }

    /** POST /api/sets → Create a new set.
     *  Body: JSON { title, description, isPublic, owner: { id } }
     */

    @PostMapping
    public ResponseEntity<FlashcardSetDto> createSet(@RequestBody FlashcardSet set,
                                                     @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        User owner = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        set.setOwner(owner);

        if (set.getCards() != null) {
            for (Flashcard card : set.getCards()) {
                card.setSet(set);
            }
        }

        FlashcardSet saved = flashcardSetService.save(set);
        return ResponseEntity.ok(FlashcardSetMapper.toDto(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSet(@PathVariable Long id,
                                       @RequestBody FlashcardSet incomingSet,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        FlashcardSet existingSet = flashcardSetService.getById(id)
                .orElse(null);
        if (existingSet == null) {
            return ResponseEntity.notFound().build();
        }

        String username = userDetails.getUsername();
        if (existingSet.getOwner() == null || !username.equals(existingSet.getOwner().getUsername())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can edit only your own sets");
        }

        existingSet.setTitle(incomingSet.getTitle());
        existingSet.setDescription(incomingSet.getDescription());
        existingSet.setPublic(incomingSet.isPublic());
        existingSet.getCards().clear();

        if (incomingSet.getCards() != null) {
            for (Flashcard card : incomingSet.getCards()) {
                card.setSet(existingSet);
                existingSet.getCards().add(card);
            }
        }

        FlashcardSet saved = flashcardSetService.save(existingSet);
        return ResponseEntity.ok(FlashcardSetMapper.toDto(saved));
    }



    /** DELETE /api/sets/{id} → Delete a set by ID */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSet(@PathVariable Long id) {
        flashcardSetService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
