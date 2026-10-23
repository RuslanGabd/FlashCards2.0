package card.flash.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.ToString;


import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "flashcard")
public class Flashcard {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "flashcard_seq")
    @SequenceGenerator(name = "flashcard_seq", sequenceName = "flashcard_seq", allocationSize = 1)
    private Long id;

    private String term;

    private String definition;

    @Column(name = "sort_position", nullable = false)
    private int position;

    @Column(name = "image_data", columnDefinition = "TEXT")
    private String image;

    @Column(name = "client_id", nullable = false, length = 36)
    private String clientId;

    @Column(name = "example_sentence", length = 2_000)
    private String exampleSentence;

    @ManyToOne
    @JoinColumn(name = "set_id", nullable = false)
    private FlashcardSet set;

    @Builder.Default
    @OneToMany(mappedBy = "flashcard", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<FlashcardAnnotation> annotations = new ArrayList<>();




    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    void ensureClientId() {
        if (clientId == null || clientId.isBlank()) {
            clientId = UUID.randomUUID().toString();
        }
    }


    // Getters and setters (or use Lombok)
}
