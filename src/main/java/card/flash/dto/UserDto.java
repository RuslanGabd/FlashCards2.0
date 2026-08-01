package card.flash.dto;

import card.flash.entity.User;
import lombok.Data;

@Data
public class UserDto {
    private Long id;
    private String username;
    private String email;

    public static UserDto from(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        return dto;
    }
}
