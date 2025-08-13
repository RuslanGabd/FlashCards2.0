package card.flash.mapper;

import card.flash.dto.FlashcardSetDto;
import card.flash.entity.FlashcardSet;

public class FlashcardSetMapper {

    public static FlashcardSetDto toDto(FlashcardSet set) {
        FlashcardSetDto dto = new FlashcardSetDto();
        dto.setId(set.getId());
        dto.setTitle(set.getTitle());
        dto.setDescription(set.getDescription());
        dto.setPublic(set.isPublic());

        if (set.getOwner() != null) {
            dto.setOwnerUsername(set.getOwner().getUsername());
        }

        return dto;
    }

    // Optional: if you want to convert back to entity
    public static FlashcardSet toEntity(FlashcardSetDto dto) {
        FlashcardSet set = new FlashcardSet();
        set.setId(dto.getId());
        set.setTitle(dto.getTitle());
        set.setDescription(dto.getDescription());
        set.setPublic(dto.isPublic());
        // Note: owner needs to be set manually
        return set;
    }
}
