package card.flash.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.List;

/** CF-Connecting-IP is trusted only when the immediate peer is an explicitly trusted proxy. */
@Component
public class ClientAddressResolver {
    private final List<IpAddressMatcher> trustedProxies;

    public ClientAddressResolver(@Value("${app.proxy.trusted-cidrs:}") String cidrs) {
        trustedProxies = Arrays.stream(cidrs.split(",")).map(String::trim).filter(value -> !value.isEmpty())
                .map(IpAddressMatcher::new).toList();
    }

    public String resolve(HttpServletRequest request) {
        String peer = literalAddress(request.getRemoteAddr());
        if (peer == null) return "unknown";
        if (trustedProxies.stream().anyMatch(proxy -> proxy.matches(peer))) {
            String client = literalAddress(request.getHeader("CF-Connecting-IP"));
            if (client != null) return client;
        }
        return peer;
    }

    private String literalAddress(String value) {
        if (value == null || value.length() > 45 || !value.matches("[0-9a-fA-F:.]+")) return null;
        if (!value.contains(":")) {
            String[] parts = value.split("\\.", -1);
            if (parts.length != 4) return null;
            for (String part : parts) {
                if (part.isEmpty() || part.length() > 3 || !part.matches("[0-9]+") || Integer.parseInt(part) > 255) return null;
            }
        }
        try {
            // Only numeric literals reach this call; hostnames and address lists never trigger DNS lookups.
            return InetAddress.getByName(value).getHostAddress();
        } catch (UnknownHostException exception) {
            return null;
        }
    }
}
