// src/main/java/card/flash/entity/FlashcardSet.java
package card.flash.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "flashcard_set")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlashcardSet {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "flashcard_set_seq")
    @SequenceGenerator(
            name = "flashcard_set_seq",
            sequenceName = "flashcard_set_seq",
            allocationSize = 1
    )
    private Long id;

    private String title;
    private String description;

    @Column(name = "diagram_name")
    private String diagramName;
    @Column(name = "diagram_data", columnDefinition = "TEXT")
    private String diagramData;

    @Column(name = "is_public")
    private boolean isPublic;

    @Column(name = "language_code", nullable = false, length = 2)
    @Builder.Default
    private String language = "en";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Builder.Default
    @OneToMany(mappedBy = "set", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC, id ASC")
    private List<Flashcard> cards = new ArrayList<>();

    @Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
