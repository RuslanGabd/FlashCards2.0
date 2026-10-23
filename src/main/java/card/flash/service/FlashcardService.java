package card.flash.service;

import card.flash.entity.Flashcard;
import card.flash.entity.FlashcardSet;
import card.flash.repository.FlashcardRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FlashcardService {
    private final FlashcardRepository flashcardRepository;

    public FlashcardService(FlashcardRepository flashcardRepository) {
        this.flashcardRepository = flashcardRepository;
    }

    public List<Flashcard> findBySet(FlashcardSet set) {
        return flashcardRepository.findBySetOrderByPositionAscIdAsc(set);
    }

    public Optional<Flashcard> findById(Long id) {
        return flashcardRepository.findById(id);
    }

    public Flashcard save(Flashcard flashcard) {
        return flashcardRepository.save(flashcard);
    }

    public void deleteById(Long id) {
        flashcardRepository.deleteById(id);
    }
}
