package com.easyrenting;

import org.springframework.boot.SpringApplication;

/** Runs the app locally against a throwaway PostGIS container (no docker-compose needed). */
public class TestEasyrentingBackendApplication {

    public static void main(String[] args) {
        SpringApplication.from(EasyrentingBackendApplication::main).with(TestcontainersConfiguration.class).run(args);
    }
}
