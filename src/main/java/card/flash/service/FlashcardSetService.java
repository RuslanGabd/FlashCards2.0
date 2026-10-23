// src/main/java/card/flash/service/FlashcardSetService.java
package card.flash.service;

import card.flash.entity.FlashcardSet;
import card.flash.entity.User;
import card.flash.repository.FlashcardSetRepository;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.*;
import card.flash.dto.FlashcardSetRequest;
import card.flash.dto.FlashcardRequest;
import card.flash.entity.Flashcard;
import card.flash.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FlashcardSetService {
    private final FlashcardSetRepository flashcardSetRepository;

    public FlashcardSetService(FlashcardSetRepository flashcardSetRepository) {
        this.flashcardSetRepository = flashcardSetRepository;
    }

    public Page<FlashcardSet> searchPublic(String query, Pageable page) {
        return flashcardSetRepository.searchPublic(query, page);
    }
    public Page<FlashcardSet> searchOwner(User owner, boolean owns, String query, Pageable page) {
        return flashcardSetRepository.searchOwner(owner, owns, query, page);
    }

    public List<FlashcardSet> getAllPublicSets() {
        return flashcardSetRepository.findByIsPublicTrue();
    }

    public List<FlashcardSet> getSetsByOwner(User owner) {
        return flashcardSetRepository.findByOwner(owner);
    }

    public Optional<FlashcardSet> getById(Long id) {
        return flashcardSetRepository.findById(id);
    }

    public FlashcardSet save(FlashcardSet set) {
        return flashcardSetRepository.save(set);
    }

    public void deleteById(Long id) {
        flashcardSetRepository.deleteById(id);
    }
    @Transactional
    public FlashcardSet create(User owner, FlashcardSetRequest request) {
        FlashcardSet set = new FlashcardSet();
        set.setOwner(owner);
        applyRequest(set, request);
        return flashcardSetRepository.save(set);
    }

    @Transactional
    public FlashcardSet update(Long id, String username, FlashcardSetRequest request) {
        FlashcardSet set = getById(id).orElseThrow(() -> new ResourceNotFoundException("Flashcard set not found"));
        if (!set.getOwner().getUsername().equals(username)) throw new AccessDeniedException("You can edit only your own sets");
        applyRequest(set, request);
        return flashcardSetRepository.save(set);
    }

    private void applyRequest(FlashcardSet set, FlashcardSetRequest request) {
        long totalImageSize = request.cards().stream().map(FlashcardRequest::image)
                .filter(Objects::nonNull).mapToLong(String::length).sum();
        if (totalImageSize > 2_000_000) throw new IllegalArgumentException("Images in one set must total less than 2 MB");
        if (request.diagram() == null) {
            set.setDiagramName(null); set.setDiagramData(null);
        } else {
            set.setDiagramName(request.diagram().name());
            set.setDiagramData(ImageData.validate(request.diagram().src()));
        }
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
        int position = 0;
        for (FlashcardRequest cardRequest : request.cards()) {
            String clientId = cardRequest.clientId() == null
                    ? UUID.randomUUID().toString()
                    : cardRequest.clientId();
            if (!requestClientIds.add(clientId)) {
                throw new IllegalArgumentException("Duplicate card clientId");
            }

            Flashcard card = existingByClientId.getOrDefault(clientId, new Flashcard());
            card.setPosition(position++);
            card.setClientId(clientId);
            card.setTerm(cardRequest.term());
            card.setDefinition(cardRequest.definition());
            card.setExampleSentence(cardRequest.exampleSentence());
            card.setImage(ImageData.validate(cardRequest.image()));
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
