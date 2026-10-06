import { apiRequest } from "./client";
import type {
  Page,
  PageParams,
  PropertyDetailDto,
  PropertyImageDto,
  PropertyRequest,
  PropertyStatus,
  PropertySummaryDto,
} from "./types";

export const propertiesApi = {
  get: (id: string) => apiRequest<PropertyDetailDto>(`/properties/${id}`),
  mine: (params: PageParams = {}) => apiRequest<Page<PropertySummaryDto>>("/properties/mine", { query: { ...params } }),
  create: (body: PropertyRequest) => apiRequest<PropertyDetailDto>("/properties", { method: "POST", body }),
  update: (id: string, body: PropertyRequest) =>
    apiRequest<PropertyDetailDto>(`/properties/${id}`, { method: "PUT", body }),
  setStatus: (id: string, status: PropertyStatus) =>
    apiRequest<PropertyDetailDto>(`/properties/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id: string) => apiRequest<void>(`/properties/${id}`, { method: "DELETE" }),
  uploadImages(id: string, files: File[]) {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    return apiRequest<PropertyImageDto[]>(`/properties/${id}/images`, { method: "POST", formData });
  },
  deleteImage: (id: string, imageId: string) =>
    apiRequest<void>(`/properties/${id}/images/${imageId}`, { method: "DELETE" }),
  setCover: (id: string, imageId: string) =>
    apiRequest<void>(`/properties/${id}/images/${imageId}/cover`, { method: "PUT" }),
};
