package card.flash.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FlashcardAnnotationRequest(
        @NotNull @Size(max = 500_000) String drawingData
) {
}
