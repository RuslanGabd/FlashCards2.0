package card.flash.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "flashcard_annotation",
        uniqueConstraints = @UniqueConstraint(name = "uk_annotation_user_card", columnNames = {"user_id", "flashcard_id"}))
public class FlashcardAnnotation {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "flashcard_annotation_seq")
    @SequenceGenerator(name = "flashcard_annotation_seq", sequenceName = "flashcard_annotation_seq", allocationSize = 1)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "flashcard_id", nullable = false)
    private Flashcard flashcard;

    @Column(name = "drawing_data", nullable = false, columnDefinition = "TEXT")
    private String drawingData = "[]";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void updateTimestamp() {
        updatedAt = LocalDateTime.now();
    }
}
