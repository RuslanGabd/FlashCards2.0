package card.flash.security;

import card.flash.exception.ApiError;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class ExternalApiRateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MILLIS = 60_000;
    private static final Map<String, Integer> LIMITS = Map.of(
            "/api/ai", 10,
            "/api/dictionary", 30,
            "/api/pronunciation", 60
    );

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicLong lastCleanup = new AtomicLong();
    private final Clock clock;
    private final ObjectMapper objectMapper;

    @Autowired
    public ExternalApiRateLimitFilter(ObjectMapper objectMapper) {
        this(objectMapper, Clock.systemUTC());
    }

    ExternalApiRateLimitFilter(ObjectMapper objectMapper, Clock clock) {
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || matchedPrefix(request.getRequestURI()) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String prefix = matchedPrefix(request.getRequestURI());
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String principal = authentication != null && authentication.isAuthenticated()
                ? authentication.getName()
                : request.getRemoteAddr();
        long now = clock.millis();
        String key = prefix + ':' + principal;
        Window window = windows.compute(key, (ignored, current) ->
                current == null || now - current.startedAt >= WINDOW_MILLIS
                        ? new Window(now, 1)
                        : new Window(current.startedAt, current.count + 1));

        cleanupExpiredWindows(now);
        int limit = LIMITS.get(prefix);
        long retryAfterSeconds = Math.max(1, (WINDOW_MILLIS - (now - window.startedAt) + 999) / 1000);
        response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, limit - window.count)));

        if (window.count > limit) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), new ApiError(
                    Instant.now(clock),
                    HttpStatus.TOO_MANY_REQUESTS.value(),
                    HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase(),
                    "Rate limit exceeded",
                    request.getRequestURI(),
                    Map.of()
            ));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String matchedPrefix(String uri) {
        return LIMITS.keySet().stream()
                .filter(prefix -> uri.equals(prefix) || uri.startsWith(prefix + "/"))
                .findFirst()
                .orElse(null);
    }

    private void cleanupExpiredWindows(long now) {
        long previous = lastCleanup.get();
        if (now - previous < WINDOW_MILLIS || !lastCleanup.compareAndSet(previous, now)) {
            return;
        }
        windows.entrySet().removeIf(entry -> now - entry.getValue().startedAt >= WINDOW_MILLIS);
    }

    private record Window(long startedAt, int count) {
    }
}
