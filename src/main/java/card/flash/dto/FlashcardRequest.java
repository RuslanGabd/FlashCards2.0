package card.flash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FlashcardRequest(
        @NotBlank @Size(max = 2_000) String term,
        @NotBlank @Size(max = 5_000) String definition,
        @Size(max = 2_000) String exampleSentence
) {
}
