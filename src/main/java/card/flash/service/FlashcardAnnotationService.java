package card.flash.service;

import card.flash.entity.Flashcard;
import card.flash.entity.FlashcardAnnotation;
import card.flash.entity.User;
import card.flash.repository.FlashcardAnnotationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class FlashcardAnnotationService {

    private final FlashcardAnnotationRepository repository;

    public FlashcardAnnotationService(FlashcardAnnotationRepository repository) {
        this.repository = repository;
    }

    public Optional<FlashcardAnnotation> find(User user, Flashcard flashcard) {
        return repository.findByUserIdAndFlashcardId(user.getId(), flashcard.getId());
    }

    @Transactional
    public FlashcardAnnotation save(User user, Flashcard flashcard, String drawingData) {
        Optional<FlashcardAnnotation> existing = find(user, flashcard);
        FlashcardAnnotation annotation = existing.orElseGet(FlashcardAnnotation::new);
        annotation.setUser(user);
        annotation.setFlashcard(flashcard);
        annotation.setDrawingData(drawingData);
        if (existing.isEmpty()) {
            flashcard.getAnnotations().add(annotation);
        }
        return repository.save(annotation);
    }
}
