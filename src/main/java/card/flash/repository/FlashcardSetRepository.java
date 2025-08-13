package card.flash.repository;



import card.flash.entity.FlashcardSet;
import card.flash.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FlashcardSetRepository extends JpaRepository<FlashcardSet, Long> {
    List<FlashcardSet> findByOwner(User owner);
    List<FlashcardSet> findByIsPublicTrue();
}
