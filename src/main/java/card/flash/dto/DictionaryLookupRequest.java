package card.flash.dto;

import java.util.List;

public record DictionaryLookupRequest(List<String> words, String lang) {
}
