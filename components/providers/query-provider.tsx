"use client";

import {
  QueryClient,
  QueryClientProvider,
  MutationCache,
  QueryCache,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
        queryCache: new QueryCache({
          onError: (error: any) => {
            const message =
              error?.response?.data?.message ||
              error?.message ||
              "An error occurred while fetching data";
            toast.error(message);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error: any) => {
            const message =
              error?.response?.data?.message ||
              error?.message ||
              "An error occurred while performing the action";
            toast.error(message);
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
