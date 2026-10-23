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
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
    public ResponseEntity<List<FlashcardSetDto>> getPublicSets(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "") @Size(max = 100) String q) {
        return pageResponse(flashcardSetService.searchPublic(q.trim(), pageRequest(page, size)));
    }

    @GetMapping("/me")
    public ResponseEntity<List<FlashcardSetDto>> getMySets(@AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "") @Size(max = 100) String q) {
        User owner = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        return pageResponse(flashcardSetService.searchOwner(owner, true, q.trim(), pageRequest(page, size)));
    }

    private PageRequest pageRequest(int page, int size) {
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
    }
    private ResponseEntity<List<FlashcardSetDto>> pageResponse(Page<FlashcardSet> page) {
        return ResponseEntity.ok().header("X-Has-More", String.valueOf(page.hasNext()))
                .header("X-Total-Count", String.valueOf(page.getTotalElements()))
                .body(page.map(FlashcardSetMapper::toSummaryDto).getContent());
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

    @GetMapping("/user/{username}")
    public ResponseEntity<List<FlashcardSetDto>> getSetsByUser(
            @PathVariable @Size(min = 3, max = 50) @Pattern(regexp = "[A-Za-z0-9._-]+") String username,
            @AuthenticationPrincipal UserDetails viewer,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size,
            @RequestParam(defaultValue = "") @Size(max = 100) String q) {
        User owner = userService.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean owns = viewer != null && username.equals(viewer.getUsername());
        return pageResponse(flashcardSetService.searchOwner(owner, owns, q.trim(), pageRequest(page, size)));
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
