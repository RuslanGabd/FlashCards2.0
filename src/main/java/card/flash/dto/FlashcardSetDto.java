package card.flash.dto;

import lombok.Data;

@Data
public class FlashcardSetDto {
    private Long id;
    private String title;
    private String description;
    private DiagramDto diagram;
    private boolean isPublic;
    private String ownerUsername;
    private String language;

}
