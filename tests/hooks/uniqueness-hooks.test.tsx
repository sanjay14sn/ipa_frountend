import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useUniquenessCheck,
  type UseUniquenessCheckOptions,
} from "@/hooks/api/uniqueness.hooks";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function renderCheck(overrides: Partial<UseUniquenessCheckOptions> = {}) {
  const fetcher = overrides.fetcher ?? vi.fn().mockResolvedValue(true);
  const { result, rerender } = renderHook(
    (props: Partial<UseUniquenessCheckOptions>) =>
      useUniquenessCheck({
        keyParts: ["test", "field"],
        value: "",
        fetcher,
        takenMessage: "Already taken.",
        debounceMs: 0,
        ...overrides,
        ...props,
      }),
    { wrapper: makeWrapper(), initialProps: {} },
  );
  return { result, rerender, fetcher };
}

describe("useUniquenessCheck", () => {
  it("is idle for an empty value and does not call the fetcher", () => {
    const { result, fetcher } = renderCheck({ value: "   " });
    expect(result.current.status).toBe("idle");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("is idle when disabled even with a value", () => {
    const { result, fetcher } = renderCheck({ value: "abc", enabled: false });
    expect(result.current.status).toBe("idle");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports available when the probe returns true", async () => {
    const fetcher = vi.fn().mockResolvedValue(true);
    const { result } = renderCheck({ value: "free@x.com", fetcher });

    await waitFor(() => expect(result.current.status).toBe("available"));
    expect(result.current.isTaken).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith(
      "free@x.com",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("reports taken with the message when the probe returns false", async () => {
    const fetcher = vi.fn().mockResolvedValue(false);
    const { result } = renderCheck({ value: "dup@x.com", fetcher });

    await waitFor(() => expect(result.current.status).toBe("taken"));
    expect(result.current.isTaken).toBe(true);
    expect(result.current.error).toBe("Already taken.");
  });

  it("fails open (available) when the probe rejects", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network down"));
    const { result } = renderCheck({ value: "any@x.com", fetcher });

    await waitFor(() => expect(result.current.status).toBe("available"));
    expect(result.current.isTaken).toBe(false);
  });

  it("re-probes when the scope changes", async () => {
    const fetcher = vi.fn().mockResolvedValue(true);
    const { result, rerender } = renderCheck({
      value: "L1",
      scope: { programId: 1 },
      fetcher,
    });
    await waitFor(() => expect(result.current.status).toBe("available"));
    expect(fetcher).toHaveBeenCalledTimes(1);

    rerender({ value: "L1", scope: { programId: 2 }, fetcher });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
