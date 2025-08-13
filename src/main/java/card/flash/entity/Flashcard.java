package card.flash.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


import jakarta.persistence.*;
import java.time.LocalDateTime;

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

    @ManyToOne
    @JoinColumn(name = "set_id", nullable = false)
    private FlashcardSet set;




    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();


    // Getters and setters (or use Lombok)
}
