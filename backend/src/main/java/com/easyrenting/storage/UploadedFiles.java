package com.easyrenting.storage;

import com.easyrenting.common.ApiException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

/** Validates multipart uploads (size + magic-byte type) and stores them under random, non-guessable keys. */
@Component
public class UploadedFiles {

    public static final String URL_PREFIX = "/api/v1/files/";
    public static final DataSize MAX_FILE_SIZE = DataSize.ofMegabytes(5);

    public record StoredFile(String key, String url, FileType type, long size) {
    }

    private final StorageService storage;

    public UploadedFiles(StorageService storage) {
        this.storage = storage;
    }

    public StoredFile store(MultipartFile file, String keyPrefix, Set<FileType> allowed) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE.toBytes()) {
            throw ApiException.badRequest("File exceeds the " + MAX_FILE_SIZE.toMegabytes() + " MB limit");
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to read upload", ex);
        }
        FileType type = FileType.detect(content)
                .filter(allowed::contains)
                .orElseThrow(() -> ApiException.badRequest("Unsupported file type; allowed: " + allowed));
        String key = keyPrefix + "/" + UUID.randomUUID() + "." + type.extension();
        storage.store(key, content);
        return new StoredFile(key, URL_PREFIX + key, type, content.length);
    }

    public void delete(String key) {
        if (key != null) {
            storage.delete(key);
        }
    }

    public static String safeFileName(String original) {
        if (original == null || original.isBlank()) {
            return "document";
        }
        String name = original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[^A-Za-z0-9._ -]", "_");
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }
}
