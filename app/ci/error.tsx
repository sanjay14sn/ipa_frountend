"use client";

import { RouteErrorState } from "@/components/error/error-state";

export default function CIErrorPage(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorState {...props} scope="ci" />;
}
