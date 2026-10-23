package card.flash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DiagramDto(@NotBlank @Size(max = 255) String name,
                         @NotBlank @Size(max = 300_000) String src) {}
