"use client";

import { RouteErrorState } from "@/components/error/error-state";

export default function AdminErrorPage(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorState {...props} scope="admin" />;
}
