package card.flash.repository;

import card.flash.entity.FlashcardAnnotation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FlashcardAnnotationRepository extends JpaRepository<FlashcardAnnotation, Long> {
    Optional<FlashcardAnnotation> findByUserIdAndFlashcardId(Long userId, Long flashcardId);
}
