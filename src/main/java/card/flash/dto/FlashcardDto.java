package card.flash.dto;

import lombok.Data;

@Data
public class FlashcardDto {
    private Long id;
    private String term;
    private String definition;
    private String exampleSentence;
    private Long setId;
}
