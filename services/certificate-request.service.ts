import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export type CertificateRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface CertificateRequest {
  id: number;
  studentId: number;
  franchiseId: string;
  competitionId: number;
  registrationId: number;
  status: CertificateRequestStatus;
  adminNote: string | null;
  actionedBy: number | null;
  actionedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { id: number; name: string; rollNo: string } | null;
  franchise?: { id: string; name: string } | null;
  competition?: { id: number; title: string; competitionDate: string | null } | null;
  registration?: {
    id: number;
    completedLevel?: { id: number; name: string } | null;
  } | null;
}

export interface CertificateRequestPage {
  items: CertificateRequest[];
  total: number;
  page: number;
  totalPages: number;
}

function normalizePage(raw: unknown): CertificateRequestPage {
  const r = (raw ?? {}) as Record<string, unknown>;
  const items = Array.isArray(r.items) ? (r.items as CertificateRequest[]) : [];
  return {
    items,
    total: Number(r.total ?? items.length),
    page: Number(r.page ?? 1),
    totalPages: Number(r.totalPages ?? 1),
  };
}

// ---------------------------------------------------------------------------
// Franchisee
// ---------------------------------------------------------------------------

/** Franchisee: list own certificate requests. */
export async function listFranchiseeCertificateRequests(
  page = 1,
  limit = 20,
): Promise<CertificateRequestPage> {
  const response = await api.get("/competitions/franchise/certificate-requests", {
    params: { page, limit },
  });
  return normalizePage(unwrapData<unknown>(response));
}

/**
 * Franchisee: submit a certificate request for a student that has a paid
 * competition registration.
 */
export async function submitCertificateRequest(
  studentId: number,
  competitionId: number,
): Promise<CertificateRequest> {
  const response = await api.post("/competitions/franchise/certificate-requests", {
    studentId,
    competitionId,
  });
  return unwrapData<CertificateRequest>(response);
}

/**
 * Franchisee: download a certificate PDF.
 */
export async function downloadCertificate(id: number): Promise<void> {
  const response = await api.get(`/competitions/franchise/certificate-requests/${id}/download`, {
    responseType: "blob",
  });
  
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  
  // Extract filename from headers if possible, otherwise use a fallback
  let filename = `certificate_${id}.pdf`;
  const disposition = response.headers["content-disposition"];
  if (disposition && disposition.indexOf("attachment") !== -1) {
    const matches = /filename="([^"]*)"/.exec(disposition);
    if (matches && matches[1]) filename = matches[1];
  }

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  
  // Defer revocation to allow the browser to start the download (fixes Safari issues)
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * Franchisee: preview a certificate PDF in a new tab.
 */
export async function previewCertificate(id: number): Promise<void> {
  const response = await api.get(`/competitions/franchise/certificate-requests/${id}/download`, {
    responseType: "blob",
  });
  
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  
  window.open(url, "_blank");
  
  // Revoke the object URL after a short delay to allow the new tab to load it
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminCertRequestParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

/** Admin: list all certificate requests with optional filters. */
export async function listAdminCertificateRequests(
  params: AdminCertRequestParams = {},
): Promise<CertificateRequestPage> {
  const response = await api.get("/competitions/admin/certificate-requests", { params });
  return normalizePage(unwrapData<unknown>(response));
}

/** Admin: bulk approve certificate requests. */
export async function bulkApproveCertificateRequests(
  ids: number[],
  note?: string,
): Promise<number[]> {
  const response = await api.patch("/competitions/admin/certificate-requests/bulk-approve", {
    ids,
    note: note ?? undefined,
  });
  return unwrapData<number[]>(response);
}

/** Admin: approve a certificate request with an optional note. */
export async function approveCertificateRequest(
  id: number,
  note?: string,
): Promise<CertificateRequest> {
  const response = await api.patch(`/competitions/admin/certificate-requests/${id}/approve`, {
    note: note ?? undefined,
  });
  return unwrapData<CertificateRequest>(response);
}

/** Admin: reject a certificate request with a mandatory reason. */
export async function rejectCertificateRequest(
  id: number,
  reason: string,
): Promise<CertificateRequest> {
  const response = await api.patch(`/competitions/admin/certificate-requests/${id}/reject`, {
    reason,
  });
  return unwrapData<CertificateRequest>(response);
}

/** Admin: download a certificate PDF. */
export async function downloadAdminCertificate(id: number): Promise<void> {
  const response = await api.get(`/competitions/admin/certificate-requests/${id}/download`, {
    responseType: "blob",
  });
  
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  
  let filename = `certificate_${id}.pdf`;
  const disposition = response.headers["content-disposition"];
  if (disposition && disposition.indexOf("attachment") !== -1) {
    const matches = /filename="([^"]*)"/.exec(disposition);
    if (matches && matches[1]) filename = matches[1];
  }

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  
  // Defer revocation to allow the browser to start the download (fixes Safari issues)
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/** Admin: fetch a certificate PDF and return a Blob URL for preview. */
export async function getAdminCertificatePreviewUrl(id: number): Promise<string> {
  const response = await api.get(`/competitions/admin/certificate-requests/${id}/download`, {
    responseType: "blob",
  });
  
  const blob = new Blob([response.data], { type: "application/pdf" });
  return window.URL.createObjectURL(blob);
}
