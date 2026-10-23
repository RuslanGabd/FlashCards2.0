package card.flash.controller;

import card.flash.dto.PublicUserDto;
import card.flash.entity.User;
import card.flash.exception.ResourceNotFoundException;
import card.flash.service.UserService;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{username}")
    public PublicUserDto getUserByUsername(
            @PathVariable @Size(min = 3, max = 50) @Pattern(regexp = "[A-Za-z0-9._-]+") String username) {
        User user = userService.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return new PublicUserDto(user.getId(), user.getUsername());
    }
}
