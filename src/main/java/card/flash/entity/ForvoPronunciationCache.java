package card.flash.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "forvo_pronunciation_cache",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_forvo_pronunciation_cache_key",
                columnNames = {"cache_word", "language", "accent"}
        )
)
@Getter
@Setter
@NoArgsConstructor
public class ForvoPronunciationCache {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "forvo_pronunciation_cache_seq")
    @SequenceGenerator(
            name = "forvo_pronunciation_cache_seq",
            sequenceName = "forvo_pronunciation_cache_seq",
            allocationSize = 1
    )
    private Long id;

    @Column(name = "cache_word", nullable = false, length = 100)
    private String cacheWord;

    @Column(nullable = false, length = 8)
    private String language;

    @Column(nullable = false, length = 16)
    private String accent;

    @Column(name = "audio_url", columnDefinition = "TEXT")
    private String audioUrl;

    @Column(nullable = false, length = 64)
    private String source;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
