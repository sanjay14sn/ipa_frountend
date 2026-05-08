import type { QueryClient } from "@tanstack/react-query";

let _client: QueryClient | null = null;

export function setQueryClientBridge(client: QueryClient) {
  _client = client;
}

export function getQueryClientBridge(): QueryClient {
  if (!_client) {
    throw new Error("QueryClient not ready");
  }
  return _client;
}
