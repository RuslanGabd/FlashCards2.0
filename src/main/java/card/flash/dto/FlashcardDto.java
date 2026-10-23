package card.flash.dto;

import lombok.Data;

@Data
public class FlashcardDto {
    private Long id;
    private String term;
    private String definition;
    private String image;
    private String exampleSentence;
    private String clientId;
    private Long setId;
}
