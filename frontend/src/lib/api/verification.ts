import { apiRequest } from "./client";
import type { DocumentType, VerificationDocumentDto, VerificationDto } from "./types";

export const verificationApi = {
  get: () => apiRequest<VerificationDto>("/verification"),
  upload(file: File, documentType: DocumentType) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    return apiRequest<VerificationDocumentDto>("/verification/documents", { method: "POST", formData });
  },
  remove: (docId: string) => apiRequest<void>(`/verification/documents/${docId}`, { method: "DELETE" }),
  submit: () => apiRequest<VerificationDto>("/verification/submit", { method: "POST" }),
};
