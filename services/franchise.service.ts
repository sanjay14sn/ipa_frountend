import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
});

// Note: CSV template is generated on the client now

export async function bulkUploadFranchises(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/franchise/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
