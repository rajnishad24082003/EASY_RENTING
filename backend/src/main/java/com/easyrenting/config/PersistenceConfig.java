package com.easyrenting.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration(proxyBeanMethods = false)
@EnableJpaAuditing
public class PersistenceConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
