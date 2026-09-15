package com.secureid.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${secureid.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${secureid.cors.allowed-methods}")
    private String allowedMethods;

    @Value("${secureid.cors.allowed-headers}")
    private String allowedHeaders;

    @Value("${secureid.cors.allow-credentials}")
    private boolean allowCredentials;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(Arrays.stream(allowedMethods.split(",")).map(String::trim).toList());
        if ("*".equals(allowedHeaders)) {
            config.setAllowedHeaders(List.of("*"));
        } else {
            config.setAllowedHeaders(Arrays.stream(allowedHeaders.split(",")).map(String::trim).toList());
        }
        config.setAllowCredentials(allowCredentials);
        config.setExposedHeaders(List.of("Authorization", "X-Correlation-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
