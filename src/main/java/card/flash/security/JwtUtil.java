package card.flash.security;

import card.flash.repository.UserRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Component
public class JwtUtil {
    private final Key key;
    private final Duration ttl;
    private final UserRepository users;

    public JwtUtil(@Value("${app.jwt.secret}") String secret,
                   @Value("${app.jwt.ttl:PT1H}") Duration ttl, UserRepository users) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.ttl = ttl;
        this.users = users;
        if (ttl.isNegative() || ttl.isZero()) throw new IllegalArgumentException("JWT TTL must be positive");
    }

    public String generateToken(String username) {
        var user = users.findByUsername(username).orElseThrow();
        Instant now = Instant.now();
        return Jwts.builder().setSubject(username).claim("ver", user.getSessionVersion())
                .setIssuedAt(Date.from(now)).setExpiration(Date.from(now.plus(ttl)))
                .signWith(key, SignatureAlgorithm.HS256).compact();
    }

    public Optional<String> validatedUsername(String token) {
        try {
            Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
            Integer version = claims.get("ver", Integer.class);
            if (claims.getSubject() == null || version == null) return Optional.empty();
            return users.findByUsername(claims.getSubject())
                    .filter(user -> user.getSessionVersion() == version).map(user -> user.getUsername());
        } catch (JwtException | IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}
