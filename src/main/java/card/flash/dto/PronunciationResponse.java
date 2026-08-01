package card.flash.dto;

public record PronunciationResponse(
        String word,
        String language,
        String audioUrl,
        String source
) {
}
