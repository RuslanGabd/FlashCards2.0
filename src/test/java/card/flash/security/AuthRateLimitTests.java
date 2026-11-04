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
                Clock.fixed(Instant.now(), ZoneOffset.UTC), new ClientAddressResolver("127.0.0.1/32,::1/128"));
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

    @Test
    void forwardingHeadersAreIgnoredUntilAProxyIsExplicitlyTrusted() {
        var resolver = new ClientAddressResolver("");
        var request = new MockHttpServletRequest(); request.setRemoteAddr("127.0.0.1");
        request.addHeader("CF-Connecting-IP", "198.51.100.10");
        assertThat(resolver.resolve(request)).isEqualTo("127.0.0.1");
    }

    @Test
    void trustedCloudflareProxyKeepsSeparateClientLimits() throws Exception {
        var filter = new ExternalApiRateLimitFilter(new ObjectMapper().findAndRegisterModules(),
                Clock.fixed(Instant.now(), ZoneOffset.UTC), new ClientAddressResolver("127.0.0.1/32,::1/128"));
        for (int i = 0; i < 21; i++) {
            assertThat(attempt(filter, "127.0.0.1", "198.51.100.10")).isEqualTo(i < 20 ? 200 : 429);
        }
        assertThat(attempt(filter, "127.0.0.1", "198.51.100.20")).isEqualTo(200);
        assertThat(attempt(filter, "::1", "198.51.100.30")).isEqualTo(200);
    }

    @Test
    void directClientsCannotRotateForwardingHeadersToBypassTheirLimit() throws Exception {
        var filter = new ExternalApiRateLimitFilter(new ObjectMapper().findAndRegisterModules(),
                Clock.fixed(Instant.now(), ZoneOffset.UTC), new ClientAddressResolver("127.0.0.1/32"));
        for (int i = 0; i < 21; i++) {
            assertThat(attempt(filter, "192.0.2.1", "198.51.100." + i)).isEqualTo(i < 20 ? 200 : 429);
        }
    }

    @Test
    void malformedHeadersAndEquivalentIpv6AddressesCannotCreateExtraIdentities() throws Exception {
        var resolver = new ClientAddressResolver("127.0.0.1/32");
        for (String header : new String[]{"example.com", "192.0.2.1, 192.0.2.2", "999.1.2.3", ""}) {
            var request = new MockHttpServletRequest(); request.setRemoteAddr("127.0.0.1");
            request.addHeader("CF-Connecting-IP", header);
            assertThat(resolver.resolve(request)).isEqualTo("127.0.0.1");
        }
        var shortForm = new MockHttpServletRequest(); shortForm.setRemoteAddr("127.0.0.1");
        shortForm.addHeader("CF-Connecting-IP", "2001:db8::1");
        var longForm = new MockHttpServletRequest(); longForm.setRemoteAddr("127.0.0.1");
        longForm.addHeader("CF-Connecting-IP", "2001:0db8:0:0:0:0:0:1");
        assertThat(resolver.resolve(shortForm)).isEqualTo(resolver.resolve(longForm));
    }

    private int attempt(ExternalApiRateLimitFilter filter, String peer, String client) throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr(peer);
        request.addHeader("CF-Connecting-IP", client);
        request.addHeader("X-Forwarded-For", client);
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> {});
        return response.getStatus();
    }
}
