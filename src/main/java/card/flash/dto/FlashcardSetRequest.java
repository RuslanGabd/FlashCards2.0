package card.flash.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record FlashcardSetRequest(
        @NotBlank @Size(max = 100) String title,
        @Size(max = 2_000) String description,
        @JsonProperty("public") boolean publicSet,
        @Size(max = 500) List<@Valid FlashcardRequest> cards
) {
}
