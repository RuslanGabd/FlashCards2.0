// src/main/java/card/flash/service/FlashcardSetService.java
package card.flash.service;

import card.flash.entity.FlashcardSet;
import card.flash.entity.User;
import card.flash.repository.FlashcardSetRepository;
import card.flash.repository.FlashcardRepository;
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
import card.flash.validation.FlashcardLimits;

@Service
public class FlashcardSetService {
    private final FlashcardSetRepository flashcardSetRepository;
    private final FlashcardRepository flashcardRepository;

    public FlashcardSetService(FlashcardSetRepository flashcardSetRepository, FlashcardRepository flashcardRepository) {
        this.flashcardSetRepository = flashcardSetRepository;
        this.flashcardRepository = flashcardRepository;
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
        FlashcardSet set = lockedOwnedSet(id, username);
        applyRequest(set, request);
        return flashcardSetRepository.save(set);
    }

    @Transactional
    public Flashcard appendCard(Long id, String username, FlashcardRequest request) {
        FlashcardSet set = lockedOwnedSet(id, username);
        String image = ImageData.validate(request.image());
        long imageCharacters = set.getCards().stream().map(Flashcard::getImage)
                .filter(Objects::nonNull).mapToLong(String::length).sum() + image.length();
        FlashcardLimits.validate(set.getCards().size() + 1, imageCharacters);

        Flashcard card = new Flashcard();
        card.setClientId(request.clientId() == null ? UUID.randomUUID().toString() : request.clientId());
        card.setTerm(request.term());
        card.setDefinition(request.definition());
        card.setExampleSentence(request.exampleSentence());
        card.setImage(image);
        card.setPosition(set.getCards().stream().mapToInt(Flashcard::getPosition).max().orElse(-1) + 1);
        card.setSet(set);
        set.getCards().add(card);
        return flashcardRepository.saveAndFlush(card);
    }

    private FlashcardSet lockedOwnedSet(Long id, String username) {
        FlashcardSet set = flashcardSetRepository.findLockedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Flashcard set not found"));
        if (!set.getOwner().getUsername().equals(username)) {
            throw new AccessDeniedException("You can edit only your own sets");
        }
        return set;
    }

    private void applyRequest(FlashcardSet set, FlashcardSetRequest request) {
        if (request.cards() == null || request.cards().stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("Cards must not contain null elements");
        }
        long totalImageSize = request.cards().stream().map(FlashcardRequest::image)
                .filter(Objects::nonNull).mapToLong(String::length).sum();
        FlashcardLimits.validate(request.cards().size(), totalImageSize);
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
