package card.flash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record DictionaryLookupRequest(
        @NotEmpty @Size(max = 50) List<@NotBlank @Size(max = 100) String> words,
        @Pattern(regexp = "(?i)en-ru|ru-en") String lang
) {
}
