"use client";

import { RouteErrorState } from "@/components/error/error-state";

export default function ErrorPage(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorState {...props} scope="root" fullScreen />;
}
