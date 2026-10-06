package com.easyrenting.verification;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.easyrenting.IntegrationTest;
import com.easyrenting.user.Role;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

class VerificationIT extends IntegrationTest {

    private static final byte[] PDF = "%PDF-1.4\n%%EOF\n".getBytes(StandardCharsets.US_ASCII);

    private ResultActions upload(Session owner, String type, byte[] content) throws Exception {
        return perform(multipart("/api/v1/verification/documents")
                .file(new MockMultipartFile("file", "id-card.pdf", "application/pdf", content))
                .param("documentType", type), owner);
    }

    @Test
    void ownerVerificationApprovalMakesListingsPublic() throws Exception {
        Session owner = register(Role.OWNER);
        Session admin = admin();
        UUID listing = createListing(owner, listing(12.9, 77.6, b -> { }));
        getAs(null, "/api/v1/properties/{id}", listing).andExpect(status().isNotFound());

        postAs(owner, "/api/v1/verification/submit", null).andExpect(status().isBadRequest());
        upload(owner, "PROPERTY_PROOF", PDF).andExpect(status().isOk());
        postAs(owner, "/api/v1/verification/submit", null).andExpect(status().isBadRequest());

        String url = read(upload(owner, "AADHAAR", PDF)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentType").value("AADHAAR"))
                .andExpect(jsonPath("$.fileName").value("id-card.pdf")), "$.url");
        String docId = read(getAs(owner, "/api/v1/verification"), "$.documents[1].id");

        postAs(owner, "/api/v1/verification/submit", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.submittedAt").isString())
                .andExpect(jsonPath("$.documents.length()").value(2));
        perform(delete("/api/v1/verification/documents/{id}", docId), owner).andExpect(status().isConflict());
        postAs(owner, "/api/v1/verification/submit", null).andExpect(status().isConflict());

        // Private documents: owner and admins only.
        perform(get(url), owner).andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"));
        perform(get(url), admin).andExpect(status().isOk());
        perform(get(url), register(Role.OWNER)).andExpect(status().isForbidden());
        mvc.perform(get(url)).andExpect(status().isUnauthorized());

        getAs(admin, "/api/v1/admin/verifications?size=100")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].owner.id", hasItem(owner.id().toString())));

        postAs(admin, "/api/v1/admin/verifications/{id}/approve", null, owner.id())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.owner.verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.verification.status").value("VERIFIED"))
                .andExpect(jsonPath("$.listingCount").value(1));

        getAs(null, "/api/v1/properties/{id}", listing)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerVerified").value(true));
        getAs(owner, "/api/v1/notifications").andExpect(jsonPath("$.content[0].type").value("VERIFICATION_APPROVED"));
        postAs(admin, "/api/v1/admin/verifications/{id}/approve", null, owner.id()).andExpect(status().isConflict());
    }

    @Test
    void rejectedOwnersCanResubmit() throws Exception {
        Session owner = register(Role.OWNER);
        Session admin = admin();
        upload(owner, "PAN", PDF).andExpect(status().isOk());
        postAs(owner, "/api/v1/verification/submit", null).andExpect(status().isOk());

        postAs(admin, "/api/v1/admin/verifications/{id}/reject", Map.of("reason", "no"), owner.id())
                .andExpect(status().isBadRequest());
        postAs(admin, "/api/v1/admin/verifications/{id}/reject", Map.of("reason", "Document is blurry"), owner.id())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verification.status").value("REJECTED"))
                .andExpect(jsonPath("$.verification.rejectionReason").value("Document is blurry"));

        upload(owner, "PASSPORT", PDF).andExpect(status().isOk());
        postAs(owner, "/api/v1/verification/submit", null)
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.rejectionReason").doesNotExist());
    }

    @Test
    void rejectsNonDocumentUploadsAndNonOwners() throws Exception {
        Session owner = register(Role.OWNER);
        upload(owner, "AADHAAR", "MZ\u0090executable".getBytes(StandardCharsets.ISO_8859_1))
                .andExpect(status().isBadRequest());
        getAs(register(Role.TENANT), "/api/v1/verification").andExpect(status().isForbidden());
    }

    @Test
    void adminStatsAndListings() throws Exception {
        Session admin = admin();
        getAs(admin, "/api/v1/admin/stats")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers").isNumber())
                .andExpect(jsonPath("$.activeListings").isNumber())
                .andExpect(jsonPath("$.messagesThisWeek").isNumber());
        getAs(admin, "/api/v1/admin/users?role=ADMIN").andExpect(jsonPath("$.content[0].role").value("ADMIN"));
        getAs(admin, "/api/v1/admin/properties?status=ACTIVE").andExpect(status().isOk());
    }
}
