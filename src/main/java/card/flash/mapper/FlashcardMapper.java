package card.flash.mapper;

import card.flash.dto.FlashcardDto;
import card.flash.entity.Flashcard;

public class FlashcardMapper {

    public static FlashcardDto toDto(Flashcard entity) {
        FlashcardDto dto = new FlashcardDto();
        dto.setId(entity.getId());
        dto.setTerm(entity.getTerm());
        dto.setDefinition(entity.getDefinition());
        dto.setExampleSentence(entity.getExampleSentence());
        dto.setClientId(entity.getClientId());

        if (entity.getSet() != null) {
            dto.setSetId(entity.getSet().getId());
        }

        return dto;
    }

    public static Flashcard toEntity(FlashcardDto dto) {
        Flashcard flashcard = new Flashcard();
        flashcard.setId(dto.getId());
        flashcard.setTerm(dto.getTerm());
        flashcard.setDefinition(dto.getDefinition());
        flashcard.setExampleSentence(dto.getExampleSentence());
        flashcard.setClientId(dto.getClientId());
        // You must manually set the FlashcardSet later (in controller/service)
        return flashcard;
    }
}
