package card.flash.dto;

public record SignupRequest(
        String username,
        String email,
        String password
) {
}
