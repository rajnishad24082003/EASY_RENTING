package com.easyrenting.storage;

import java.util.Optional;
import org.springframework.core.io.Resource;

/**
 * Pluggable binary storage. Keys are relative, slash-separated paths; keys under {@code public/} may be served to
 * anyone, keys under {@code private/} require an access check by the caller.
 */
public interface StorageService {

    void store(String key, byte[] content);

    Optional<Resource> load(String key);

    void delete(String key);
}
