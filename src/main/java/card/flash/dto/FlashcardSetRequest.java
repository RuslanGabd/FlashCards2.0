package card.flash.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record FlashcardSetRequest(
        @NotBlank @Size(max = 100) String title,
        @Size(max = 2_000) String description,
        @JsonProperty("public") boolean publicSet,
        @Pattern(regexp = "(?i)en|fr") String language,
        @NotNull @Size(min = 1, max = 500) List<@Valid FlashcardRequest> cards,
        @Valid DiagramDto diagram
) {
}
