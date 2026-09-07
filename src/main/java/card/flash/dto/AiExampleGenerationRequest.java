package card.flash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AiExampleGenerationRequest(
        @NotBlank @Size(max = 2_000) String term,
        @Size(max = 5_000) String definition,
        @Pattern(regexp = "(?i)en|fr") String language
) {
}
