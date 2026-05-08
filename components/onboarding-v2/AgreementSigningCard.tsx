"use client";

import type { ReactNode } from "react";

/** Minimal card wrapper for agreement signing entry points (wire to /agreement/:id/sign). */
export function AgreementSigningCard(props: {
  agreementId: number;
  status?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded border p-4 text-sm">
      <div className="font-medium">Agreement #{props.agreementId}</div>
      {props.status ? (
        <div className="text-muted-foreground mt-1">Status: {props.status}</div>
      ) : null}
      {props.children ? <div className="mt-3">{props.children}</div> : null}
    </div>
  );
}
