package card.flash.repository;



import card.flash.entity.FlashcardSet;
import card.flash.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface FlashcardSetRepository extends JpaRepository<FlashcardSet, Long> {
    List<FlashcardSet> findByOwner(User owner);
    List<FlashcardSet> findByIsPublicTrue();
    @EntityGraph(attributePaths = "owner")
    @Query("select s from FlashcardSet s where s.isPublic = true and "
            + "(lower(s.title) like lower(concat('%', :q, '%')) or lower(coalesce(s.description, '')) like lower(concat('%', :q, '%')) "
            + "or lower(s.owner.username) like lower(concat('%', :q, '%')))")
    Page<FlashcardSet> searchPublic(String q, Pageable pageable);

    @EntityGraph(attributePaths = "owner")
    @Query("select s from FlashcardSet s where s.owner = :owner and (:owns = true or s.isPublic = true) and "
            + "(lower(s.title) like lower(concat('%', :q, '%')) or lower(coalesce(s.description, '')) like lower(concat('%', :q, '%')))")
    Page<FlashcardSet> searchOwner(User owner, boolean owns, String q, Pageable pageable);
}
