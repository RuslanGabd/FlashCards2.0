package card.flash.mapper;

import card.flash.dto.FlashcardDto;
import card.flash.entity.Flashcard;

public class FlashcardMapper {

    public static FlashcardDto toDto(Flashcard entity) {
        FlashcardDto dto = new FlashcardDto();
        dto.setId(entity.getId());
        dto.setTerm(entity.getTerm());
        dto.setDefinition(entity.getDefinition());

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
        // You must manually set the FlashcardSet later (in controller/service)
        return flashcard;
    }
}
