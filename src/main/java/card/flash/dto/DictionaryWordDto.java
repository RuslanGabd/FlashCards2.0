package card.flash.dto;

import java.util.List;

public record DictionaryWordDto(
        String word,
        String translation,
        List<String> alternatives,
        String partOfSpeech,
        String transcription
) {
}
