package card.flash.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private static final String FRONTEND_LOCATION = Paths.get("front")
            .toAbsolutePath()
            .normalize()
            .toUri()
            .toString();
    private static final String FRONTEND_CSS_LOCATION = Paths.get("front", "css")
            .toAbsolutePath()
            .normalize()
            .toUri()
            .toString();
    private static final String FRONTEND_JS_LOCATION = Paths.get("front", "js")
            .toAbsolutePath()
            .normalize()
            .toUri()
            .toString();

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/*.html")
                .addResourceLocations(FRONTEND_LOCATION);
        registry.addResourceHandler("/css/**")
                .addResourceLocations(FRONTEND_CSS_LOCATION);
        registry.addResourceHandler("/js/**")
                .addResourceLocations(FRONTEND_JS_LOCATION);
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addRedirectViewController("/", "/index.html");
    }
}
