package card.flash.repository;

import card.flash.entity.Flashcard;
import card.flash.entity.FlashcardSet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FlashcardRepository extends JpaRepository<Flashcard, Long> {
    List<Flashcard> findBySet(FlashcardSet set);
}
