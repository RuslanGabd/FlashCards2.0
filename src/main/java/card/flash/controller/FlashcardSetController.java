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

    @GetMapping("/public")
    public ResponseEntity<List<FlashcardSetDto>> getPublicSets() {
        List<FlashcardSet> sets = flashcardSetService.getAllPublicSets();

        List<FlashcardSetDto> dtoList = sets.stream()
                .map(FlashcardSetMapper::toSummaryDto)
                .toList();

        return ResponseEntity.ok(dtoList);
    }

    @GetMapping("/me")
    public ResponseEntity<List<FlashcardSetDto>> getMySets(@AuthenticationPrincipal UserDetails userDetails) {
        User owner = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<FlashcardSetDto> dtoList = flashcardSetService.getSetsByOwner(owner).stream()
                .map(FlashcardSetMapper::toSummaryDto)
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
            @PathVariable @Size(min = 3, max = 50) @Pattern(regexp = "[A-Za-z0-9._-]+") String username,
            @AuthenticationPrincipal UserDetails viewer) {
        User owner = userService.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<FlashcardSet> sets = flashcardSetService.getSetsByOwner(owner);
        boolean owns = viewer != null && username.equals(viewer.getUsername());
        return ResponseEntity.ok(sets.stream().filter(set -> owns || set.isPublic())
                .map(FlashcardSetMapper::toSummaryDto).toList());
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

        FlashcardSet saved = flashcardSetService.create(owner, request);

        return ResponseEntity.ok(FlashcardSetMapper.toDto(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSet(@PathVariable @Positive Long id,
                                       @Valid @RequestBody FlashcardSetRequest request,
                                       @AuthenticationPrincipal UserDetails userDetails) {
        FlashcardSet saved = flashcardSetService.update(id, userDetails.getUsername(), request);

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

}
