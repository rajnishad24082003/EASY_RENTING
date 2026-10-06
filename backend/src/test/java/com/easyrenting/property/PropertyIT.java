package com.easyrenting.property;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.easyrenting.IntegrationTest;
import com.easyrenting.user.Role;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

class PropertyIT extends IntegrationTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};

    @Test
    void tenantsCannotCreateListings() throws Exception {
        Session tenant = register(Role.TENANT);
        postAs(tenant, "/api/v1/properties", listing(12.9, 77.6, b -> { }))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void validatesListingPayload() throws Exception {
        Session owner = register(Role.OWNER);
        postAs(owner, "/api/v1/properties", listing(12.9, 77.6, b -> {
            b.put("rent", 0);
            b.put("pincode", "12");
            b.put("title", "short");
        }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[*].field", hasItem("rent")))
                .andExpect(jsonPath("$.errors[*].field", hasItem("pincode")))
                .andExpect(jsonPath("$.errors[*].field", hasItem("title")));
    }

    @Test
    void unverifiedOwnersListingIsHiddenFromPublicButVisibleToOwner() throws Exception {
        Session owner = register(Role.OWNER);
        UUID id = createListing(owner, listing(12.9, 77.6, b -> { }));

        getAs(null, "/api/v1/properties/{id}", id).andExpect(status().isNotFound());
        getAs(owner, "/api/v1/properties/{id}", id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.ownerVerified").value(false))
                .andExpect(jsonPath("$.owner.id").value(owner.id().toString()))
                .andExpect(jsonPath("$.amenities.length()").value(2));
    }

    @Test
    void ownerCanUpdateAndOthersCannot() throws Exception {
        Session owner = verifiedOwner();
        Session otherOwner = verifiedOwner();
        Session admin = admin();
        UUID id = createListing(owner, listing(12.9, 77.6, b -> b.put("status", "DRAFT")));
        Map<String, Object> update = listing(12.9, 77.6, b -> b.put("rent", 42_000));

        perform(put("/api/v1/properties/{id}", id).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(update)), otherOwner)
                .andExpect(status().isForbidden());

        // status omitted on update keeps the current status (DRAFT), it is not reset to ACTIVE
        perform(put("/api/v1/properties/{id}", id).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(update)), owner)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rent").value(42_000))
                .andExpect(jsonPath("$.status").value("DRAFT"));

        perform(patch("/api/v1/properties/{id}/status", id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"RENTED\"}"), admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RENTED"));
    }

    @Test
    void publicDetailCountsViewsAndSoftDeleteHidesListing() throws Exception {
        Session owner = verifiedOwner();
        UUID id = createListing(owner, listing(12.9, 77.6, b -> { }));

        getAs(null, "/api/v1/properties/{id}", id).andExpect(status().isOk());
        getAs(null, "/api/v1/properties/{id}", id).andExpect(jsonPath("$.viewCount").value(1));

        getAs(owner, "/api/v1/properties/mine")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].id", hasItem(id.toString())));

        perform(delete("/api/v1/properties/{id}", id), owner).andExpect(status().isNoContent());
        getAs(null, "/api/v1/properties/{id}", id).andExpect(status().isNotFound());
        getAs(owner, "/api/v1/properties/mine")
                .andExpect(jsonPath("$.content[*].id", not(hasItem(id.toString()))));
    }

    @Test
    void ownerUploadsImagesValidatedByMagicBytes() throws Exception {
        Session owner = verifiedOwner();
        UUID id = createListing(owner, listing(12.9, 77.6, b -> { }));

        String url = read(perform(multipart("/api/v1/properties/{id}/images", id)
                .file(new MockMultipartFile("files", "a.png", "image/png", PNG))
                .file(new MockMultipartFile("files", "b.png", "image/png", PNG)), owner)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].cover").value(true))
                .andExpect(jsonPath("$[0].url", startsWith("/api/v1/files/public/properties/"))), "$[0].url");

        mvc.perform(get(url))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"));

        // A "PNG" that is really text is rejected regardless of the declared content type.
        perform(multipart("/api/v1/properties/{id}/images", id)
                .file(new MockMultipartFile("files", "evil.png", "image/png", "<script>".getBytes())), owner)
                .andExpect(status().isBadRequest());

        String secondId = read(getAs(owner, "/api/v1/properties/{id}", id), "$.images[1].id");
        perform(put("/api/v1/properties/{id}/images/{imageId}/cover", id, secondId), owner)
                .andExpect(status().isNoContent());
        getAs(owner, "/api/v1/properties/{id}", id).andExpect(jsonPath("$.images[1].cover").value(true));

        Session stranger = verifiedOwner();
        perform(delete("/api/v1/properties/{id}/images/{imageId}", id, secondId), stranger)
                .andExpect(status().isForbidden());
        perform(delete("/api/v1/properties/{id}/images/{imageId}", id, secondId), owner)
                .andExpect(status().isNoContent());
        getAs(owner, "/api/v1/properties/{id}", id)
                .andExpect(jsonPath("$.images.length()").value(1))
                .andExpect(jsonPath("$.images[0].cover").value(true));
    }

    @Test
    void pathTraversalInFileKeysIsRejected() throws Exception {
        // Rejected by the security firewall (400) before reaching storage.
        mvc.perform(get("/api/v1/files/public/../../etc/passwd")).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/v1/files/public/%2e%2e/%2e%2e/etc/passwd")).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/v1/files/other/thing.png")).andExpect(status().isNotFound());
    }
}
