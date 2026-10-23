package card.flash.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import static org.assertj.core.api.Assertions.assertThat;

class AuthRateLimitTests {
    @Test
    void loginIsLimitedByAddressAndOtherAddressesCanStillLogin() throws Exception {
        var filter = new ExternalApiRateLimitFilter(new ObjectMapper().findAndRegisterModules(),
                Clock.fixed(Instant.now(), ZoneOffset.UTC));
        for (int i = 0; i < 21; i++) {
            var request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr("192.0.2.1");
            var response = new MockHttpServletResponse();
            filter.doFilter(request, response, (req, res) -> {});
            assertThat(response.getStatus()).isEqualTo(i < 20 ? 200 : 429);
            if (i == 20) assertThat(response.getHeader("Retry-After")).isNotNull();
        }
        var other = new MockHttpServletRequest("POST", "/api/auth/login");
        other.setRemoteAddr("192.0.2.2");
        var response = new MockHttpServletResponse();
        filter.doFilter(other, response, (req, res) -> {});
        assertThat(response.getStatus()).isEqualTo(200);
    }
}
