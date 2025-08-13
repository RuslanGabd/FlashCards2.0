// src/main/java/card/flash/service/FlashcardSetService.java
package card.flash.service;

import card.flash.entity.FlashcardSet;
import card.flash.entity.User;
import card.flash.repository.FlashcardSetRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class FlashcardSetService {
    private final FlashcardSetRepository flashcardSetRepository;

    public FlashcardSetService(FlashcardSetRepository flashcardSetRepository) {
        this.flashcardSetRepository = flashcardSetRepository;
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
}
