import axios from "axios";

export interface Program {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgramsResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result: Program[];
}

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function getAllPrograms(): Promise<Program[]> {
  const response = await api.get<ProgramsResponse>("/program");
  return response.data.result;
}
