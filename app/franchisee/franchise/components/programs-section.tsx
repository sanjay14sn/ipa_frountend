"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, PenLine } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DataTable,
  type DataTableColumn,
  TablePageShell,
  TableLoadingState,
} from "@/components/shared";
import {
  listProgramRequests,
  cancelProgramRequest,
  signProgramRequest,
  type ProgramRequestItem,
} from "@/services/program-request.service";
import {
  initiateAgreementFeePayment,
  verifyFranchiseFeePayment,
} from "@/services/franchisee.service";
import { abandonOrderPayment } from "@/services/order.service";
import { RequestProgramsModal } from "@/components/request-programs-modal";
import { useUser } from "@/context/user-context";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-utils";
import {
  getProcessedAgreementContent,
  type AgreementContent,
} from "@/lib/agreementContent";
import AgreementTerms from "@/app/franchisee/agreement/components/AgreementTerms";
import RazorpayPayment, {
  type RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Requested: "bg-blue-100 text-blue-800",
    TermsSet: "bg-yellow-100 text-yellow-800",
    PendingSignature: "bg-orange-100 text-orange-800",
    Active: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
    Cancelled: "bg-gray-100 text-gray-600",
  };
  return <Badge className={colors[status] ?? ""}>{status}</Badge>;
}

// ---------------------------------------------------------------------------
// Sign Agreement Sheet
// ---------------------------------------------------------------------------
interface SignAgreementSheetProps {
  request: ProgramRequestItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSigned: () => void;
}

function SignAgreementSheet({
  request,
  open,
  onOpenChange,
  onSigned,
}: SignAgreementSheetProps) {
  const { user } = useUser();

  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementContent, setAgreementContent] =
    useState<AgreementContent | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["basic-terms", "financial-terms"])
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    orderId: string;
    amount: number;
    currency: string;
    franchiseName: string;
    key: string;
    isZeroAmount?: boolean;
  } | null>(null);

  // Build agreement content whenever the selected request or user changes
  useEffect(() => {
    if (!request || !user) return;
    const programName =
      request.program?.name ?? `Program #${request.programId}`;
    const franchiseName = request.franchise?.name ?? request.franchiseId;
    const franchiseData = {
      name: franchiseName,
      contactPerson: user?.profile?.name ?? user?.name ?? "",
      email: user?.profile?.mail ?? user?.mail ?? "",
      phone: user?.profile?.phone ?? user?.phone ?? "",
      dob: user?.profile?.dob,
      bloodGroup: user?.profile?.bloodGroup,
      educationalQualification: user?.profile?.education,
      presentOccupation: user?.profile?.occupation,
      address: user?.profile?.address ?? (user?.profile?.franchise as any)?.address ?? "",
      city: user?.profile?.city ?? user?.profile?.franchise?.city ?? "",
      state: user?.profile?.state ?? (user?.profile?.franchise as any)?.state ?? "",
      pincode: user?.profile?.pincode,
      communicationAddress: user?.profile?.communicationAddress,
      franchiseCode: `FR-${request.franchiseId}`,
      program: programName,
      franchiseType: user?.profile?.franchise?.type ?? "",
      reference: user?.profile?.reference,
      date: request.requestedAt,
      paymentDetails: [],
    } as any;
    setAgreementContent(getProcessedAgreementContent(franchiseData));
    setExpandedSections(new Set(["basic-terms", "financial-terms"]));
    setAgreementAccepted(false);
  }, [request, user]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDownloadPDF = () => {
    const link = document.createElement("a");
    link.href = "/franchisee agreement pdf.pdf";
    link.download = "Franchisee_Agreement.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSignAndPay = async () => {
    if (!agreementAccepted || !request) return;
    setIsProcessing(true);

    try {
      // Step 1: Sign the request
      await signProgramRequest(request.id);

      // Step 2: If there's an agreementId, initiate payment via agreement fee flow
      if (request.agreementId) {
        const order = await initiateAgreementFeePayment(request.agreementId);

        if (order.isZeroAmount || order.amount === 0) {
          toast.success("Agreement signed and activated!");
          setIsProcessing(false);
          onSigned();
          onOpenChange(false);
          return;
        }

        setPaymentDetails({
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          franchiseName: order.franchiseName,
          key: order.key,
          isZeroAmount: order.isZeroAmount,
        });
      } else {
        // No payment needed — signing alone activates it
        toast.success("Agreement signed successfully!");
        setIsProcessing(false);
        onSigned();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to sign agreement"));
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (response: RazorpaySuccessResponse) => {
    try {
      await verifyFranchiseFeePayment({
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      });
      toast.success("Agreement signed and payment verified!");
      onSigned();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Payment verification failed"));
    } finally {
      setIsProcessing(false);
      setPaymentDetails(null);
    }
  };

  const handlePaymentFailure = (_error: any) => {
    toast.error("Payment failed. Please try again.");
    setIsProcessing(false);
    setPaymentDetails(null);
  };

  return (
    <>
      {paymentDetails &&
        !paymentDetails.isZeroAmount &&
        paymentDetails.amount > 0 && (
          <RazorpayPayment
            orderId={paymentDetails.orderId}
            amount={paymentDetails.amount}
            currency={paymentDetails.currency}
            franchiseName={paymentDetails.franchiseName}
            razorpayKey={paymentDetails.key}
            onSuccess={handlePaymentSuccess}
            onFailure={handlePaymentFailure}
            onAbandon={async ({ orderId, reason }) => {
              await abandonOrderPayment({
                razorpayOrderId: orderId,
                note: reason,
              });
            }}
            userDetails={{
              name: user?.profile?.name ?? user?.name ?? "",
              email: user?.profile?.mail ?? user?.mail ?? "",
              phone: user?.profile?.phone ?? user?.phone ?? "",
            }}
          />
        )}

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full max-w-2xl overflow-y-auto sm:max-w-2xl"
        >
          <SheetHeader className="mb-6">
            <SheetTitle>
              Sign Program Agreement
            </SheetTitle>
            <SheetDescription>
              {request
                ? `${request.program?.name ?? `Program #${request.programId}`} — ${request.franchise?.name ?? request.franchiseId}`
                : ""}
            </SheetDescription>
          </SheetHeader>

          {agreementContent ? (
            <div className="flex flex-col gap-6">
              <AgreementTerms
                agreementContent={agreementContent}
                expandedSections={expandedSections}
                agreementAccepted={agreementAccepted}
                onToggleSection={toggleSection}
                onExpandAll={() =>
                  setExpandedSections(
                    new Set(agreementContent.sections.map((s) => s.id))
                  )
                }
                onCollapseAll={() => setExpandedSections(new Set())}
                onDownloadPDF={handleDownloadPDF}
                onAgreementChange={(v) => setAgreementAccepted(v === true)}
              />

              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground">
                      Complete your registration
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Signing will activate your program. If a fee applies, you will be prompted to pay.
                    </p>
                    {!agreementAccepted && (
                      <p className="mt-1 text-xs font-medium text-destructive">
                        Please accept the terms and conditions to proceed
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSignAndPay}
                    disabled={!agreementAccepted || isProcessing}
                    size="lg"
                    className="shrink-0 rounded-lg px-6"
                  >
                    {isProcessing ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <PenLine className="mr-2 h-4 w-4" />
                        Sign &amp; Pay
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
              Preparing agreement...
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// ProgramsSection
// ---------------------------------------------------------------------------
export function ProgramsSection() {
  const { user } = useUser();
  const [requests, setRequests] = useState<ProgramRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [signingRequest, setSigningRequest] =
    useState<ProgramRequestItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProgramRequests();
      // Filter to current franchise
      const filtered =
        user?.franchiseId
          ? data.filter((r) => r.franchiseId === user.franchiseId)
          : data;
      setRequests(filtered);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load programs"));
    } finally {
      setLoading(false);
    }
  }, [user?.franchiseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await cancelProgramRequest(id);
      toast.success("Request cancelled");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to cancel request"));
    } finally {
      setCancelling(null);
    }
  };

  const columns: DataTableColumn<ProgramRequestItem>[] = [
    {
      key: "program",
      header: "Program",
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "requestedAt",
      header: "Requested",
      className: "text-sm text-muted-foreground whitespace-nowrap",
      render: (r) =>
        r.requestedAt
          ? new Date(r.requestedAt).toLocaleDateString()
          : "-",
    },
    {
      key: "actions",
      header: "",
      className: "w-44",
      render: (r) => {
        const canSign = r.status === "PendingSignature";
        const canCancel = ["Requested", "TermsSet", "PendingSignature"].includes(
          r.status
        );
        return (
          <div className="flex items-center gap-1">
            {canSign && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setSigningRequest(r)}
              >
                <PenLine className="h-4 w-4 mr-1" />
                Sign
              </Button>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                disabled={cancelling === r.id}
                onClick={() => handleCancel(r.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <TablePageShell
        title="Programs"
        description="Manage program requests for your franchise."
        actions={
          <Button onClick={() => setRequestModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Request Program
          </Button>
        }
      >
        {loading && requests.length === 0 ? (
          <TableLoadingState message="Loading programs..." />
        ) : (
          <DataTable<ProgramRequestItem>
            data={requests}
            loading={loading}
            columns={columns}
            getRowId={(r) => String(r.id)}
            renderMainCell={(r) => (
              <div className="flex flex-col">
                <span className="font-medium">
                  {r.program?.name ?? `Program #${r.programId}`}
                </span>
                {r.franchise?.name ? (
                  <span className="text-sm text-muted-foreground">
                    {r.franchise.name}
                  </span>
                ) : null}
              </div>
            )}
            emptyMessage="No program requests yet. Click 'Request Program' to get started."
            resultsText={(_count, total) =>
              `${total} request${total === 1 ? "" : "s"}`
            }
          />
        )}

        <RequestProgramsModal
          open={requestModalOpen}
          onOpenChange={(open) => {
            setRequestModalOpen(open);
            if (!open) load();
          }}
        />
      </TablePageShell>

      <SignAgreementSheet
        request={signingRequest}
        open={signingRequest !== null}
        onOpenChange={(open) => {
          if (!open) setSigningRequest(null);
        }}
        onSigned={() => {
          setSigningRequest(null);
          load();
        }}
      />
    </>
  );
}
