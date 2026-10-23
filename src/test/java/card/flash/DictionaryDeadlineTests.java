package card.flash;

import card.flash.service.YandexDictionaryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import static org.assertj.core.api.Assertions.*;

class DictionaryDeadlineTests {
    @Test void slowProviderCannotMultiplyTheTimeoutByTheNumberOfWords() throws Exception {
        var calls = new AtomicInteger();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/lookup", exchange -> {
            calls.incrementAndGet();
            try { Thread.sleep(400); } catch (InterruptedException error) { Thread.currentThread().interrupt(); }
            try { exchange.sendResponseHeaders(200, 0); exchange.close(); } catch (java.io.IOException ignored) { }
        });
        server.start();
        try {
            var service = new YandexDictionaryService(new ObjectMapper(), "test-only",
                    "http://127.0.0.1:" + server.getAddress().getPort() + "/lookup", Duration.ofMillis(200));
            long started = System.nanoTime();
            assertThatThrownBy(() -> service.lookup(List.of("one", "two", "three"), "en-ru"))
                    .isInstanceOf(IllegalStateException.class);
            assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(2));
            assertThat(calls.get()).isLessThanOrEqualTo(1);
        } finally { server.stop(0); }
    }
}
