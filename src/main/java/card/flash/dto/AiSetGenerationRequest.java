package card.flash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AiSetGenerationRequest(
        @Size(max = 100) String title,
        @NotBlank @Size(max = 20_000) String text,
        @Pattern(regexp = "(?i)en|fr") String language
) {
}
