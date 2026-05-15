"use client";

import {
  QueryClient,
  QueryClientProvider,
  MutationCache,
  QueryCache,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { setQueryClientBridge } from "@/hooks/api/query-client-bridge";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getUserFriendlyMessage } from "@/lib/error-utils";

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
            staleTime: 3 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
        queryCache: new QueryCache({
          onError: (error: any) => {
            const message = getUserFriendlyMessage(
              error,
              "An error occurred while fetching data",
            );
            toast.error(message);
          },
        }),
        mutationCache: new MutationCache({
          onError: (error: any) => {
            const message = getUserFriendlyMessage(
              error,
              "An error occurred while performing the action",
            );
            toast.error(message);
          },
        }),
      })
  );

  useEffect(() => {
    setQueryClientBridge(queryClient);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
