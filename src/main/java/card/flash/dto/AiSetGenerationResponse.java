package card.flash.dto;

import java.util.List;

public record AiSetGenerationResponse(String title, String description, List<AiSetCardDto> cards) {
}
