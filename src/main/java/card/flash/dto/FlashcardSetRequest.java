package card.flash.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record FlashcardSetRequest(
        String title,
        String description,
        @JsonProperty("public") boolean publicSet,
        List<FlashcardRequest> cards
) {
}
