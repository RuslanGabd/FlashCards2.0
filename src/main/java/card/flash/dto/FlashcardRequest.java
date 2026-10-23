package card.flash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public record FlashcardRequest(
        @NotBlank @Size(max = 2_000) String term,
        @NotBlank @Size(max = 5_000) String definition,
        @Size(max = 2_000) String exampleSentence,
        @Pattern(regexp = "(?i)[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}") String clientId,
        @Size(max = 300_000) String image
) {
}
