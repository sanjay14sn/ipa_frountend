"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useUser } from "@/context/user-context";
import {
  getProcessedAgreementContent,
  AgreementContent,
} from "@/lib/agreementContent";
import FranchiseeInformation from "../../agreement/components/FranchiseeInformation";
import LocationDetails from "../../agreement/components/LocationDetails";
import FranchiseDetails from "../../agreement/components/FranchiseDetails";
import PaymentBreakdown from "../../agreement/components/PaymentBreakdown";
import AgreementTerms from "../../agreement/components/AgreementTerms";
import PaymentAction from "../../agreement/components/PaymentAction";
import RazorpayPayment, {
  RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";
import {
  ProgramAgreement,
  getProgramAgreements,
  initiateProgramFeePayment,
  verifyProgramFeePayment,
} from "@/services/franchise.service";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import { abandonOrderPayment } from "@/services/order.service";

function buildFranchiseData(agreement: ProgramAgreement, user: any) {
  const programName =
    agreement.franchiseProgram?.program?.name ?? `Program #${agreement.programId}`;
  const franchiseName = agreement.franchise?.name ?? agreement.franchiseId;

  return {
    name: franchiseName,
    contactPerson: user?.profile?.name ?? user?.name ?? "",
    email: user?.profile?.mail ?? user?.mail ?? "",
    phone: user?.profile?.phone ?? user?.phone ?? "",
    dob: user?.profile?.dob,
    bloodGroup: user?.profile?.bloodGroup,
    educationalQualification: user?.profile?.education,
    presentOccupation: user?.profile?.occupation,
    address: user?.profile?.address ?? user?.profile?.franchise?.address ?? "",
    city: user?.profile?.city ?? user?.profile?.franchise?.city ?? "",
    state: user?.profile?.state ?? user?.profile?.franchise?.state ?? "",
    pincode: user?.profile?.pincode,
    communicationAddress: user?.profile?.communicationAddress,
    franchiseCode: `FR-${agreement.franchiseId}`,
    program: programName,
    franchiseType: user?.profile?.franchise?.type ?? "",
    reference: user?.profile?.reference,
    date: agreement.createdAt,
    paymentDetails: [agreement],
  } as any;
}

function ProgramAgreementContent() {
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<ProgramAgreement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [agreementContent, setAgreementContent] =
    useState<AgreementContent | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [paymentDetails, setPaymentDetails] = useState<{
    orderId: string;
    amount: number;
    isZeroAmount?: boolean;
    currency: string;
    franchiseName: string;
    key: string;
  } | null>(null);

  const loadAgreements = async () => {
    setLoading(true);
    try {
      const data = await getProgramAgreements();
      setAgreements(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load agreements"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgreements();
  }, []);

  const currentAgreement = agreements[currentIndex] ?? null;

  useEffect(() => {
    if (!currentAgreement || !user) return;
    const franchiseData = buildFranchiseData(currentAgreement, user);
    const content = getProcessedAgreementContent(franchiseData);
    setAgreementContent(content);
    setExpandedSections(new Set(["basic-terms", "financial-terms"]));
    setAgreementAccepted(false);
  }, [currentAgreement, user]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (agreementContent)
      setExpandedSections(new Set(agreementContent.sections.map((s) => s.id)));
  };

  const collapseAll = () => setExpandedSections(new Set());

  const handleDownloadPDF = () => {
    const link = document.createElement("a");
    link.href = "/franchisee agreement pdf.pdf";
    link.download = "Franchisee_Agreement.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePaymentSubmit = async () => {
    if (!agreementAccepted || !currentAgreement) return;
    setIsProcessingPayment(true);
    try {
      const order = await initiateProgramFeePayment(currentAgreement.id);

      if (order.isZeroAmount || order.amount === 0) {
        setShowPaymentSuccess(true);
        setIsProcessingPayment(false);
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
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to initiate payment"));
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (response: RazorpaySuccessResponse) => {
    try {
      await verifyProgramFeePayment({
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      });
      setShowPaymentSuccess(true);
    } catch (err) {
      toast.error(getErrorMessage(err, "Payment verification failed"));
    } finally {
      setIsProcessingPayment(false);
      setPaymentDetails(null);
    }
  };

  const handlePaymentFailure = async (error: any) => {
    toast.error("Payment failed. Please try again.");
    setIsProcessingPayment(false);
    setPaymentDetails(null);
  };

  const handleNextAgreement = async () => {
    setShowPaymentSuccess(false);
    await loadAgreements();
    setCurrentIndex(0);
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading your program agreements...</p>
        </div>
      </div>
    );
  }

  // No pending agreements
  if (!currentAgreement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              No Pending Agreements
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              You have no pending program agreements to accept at this time.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment success screen
  if (showPaymentSuccess) {
    const remaining = agreements.length - currentIndex - 1;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Program Agreement Activated!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Your agreement for{" "}
              <strong>
                {currentAgreement.franchiseProgram?.program?.name ??
                  `Program #${currentAgreement.programId}`}
              </strong>{" "}
              at{" "}
              <strong>
                {currentAgreement.franchise?.name ?? currentAgreement.franchiseId}
              </strong>{" "}
              has been activated.
            </p>
            {remaining > 0 ? (
              <Button onClick={handleNextAgreement} className="w-full">
                Continue to Next Agreement ({remaining} remaining)
              </Button>
            ) : (
              <p className="text-sm text-gray-500">
                All agreements have been processed.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const franchiseData = buildFranchiseData(currentAgreement, user);

  return (
    <div className="min-h-screen p-6 md:p-8 bg-gray-50">
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

      <div className="w-full max-w-[1600px] mx-auto">
        {/* Multi-agreement counter */}
        {agreements.length > 1 && (
          <p className="text-sm text-gray-500 mb-4 text-right">
            Agreement {currentIndex + 1} of {agreements.length}
          </p>
        )}

        <div className="border-2 rounded-xl border-primary shadow-xl bg-white">
          {/* Header */}
          <div className="p-6 md:p-8 border-b-2 border-primary bg-primary/5 rounded-t-xl">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">
                Program Agreement
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                {currentAgreement.franchiseProgram?.program?.name ??
                  `Program #${currentAgreement.programId}`}{" "}
                &mdash;{" "}
                {currentAgreement.franchise?.name ?? currentAgreement.franchiseId}
              </p>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 lg:min-h-[800px]">
            {/* Left — details */}
            <div className="space-y-6 lg:col-span-2 p-6 md:p-8 bg-gray-50/50 lg:overflow-y-auto lg:max-h-[800px]">
              <FranchiseeInformation franchiseData={franchiseData} />
              <LocationDetails franchiseData={franchiseData} />
              <FranchiseDetails franchiseData={franchiseData} />
              <PaymentBreakdown paymentDetails={franchiseData.paymentDetails} />
            </div>

            {/* Right — T&C */}
            <div className="lg:col-span-3 lg:border-l-2 border-primary p-6 md:p-8 flex flex-col lg:min-h-[800px]">
              <div className="flex-1 overflow-y-auto">
                {agreementContent && (
                  <AgreementTerms
                    agreementContent={agreementContent}
                    expandedSections={expandedSections}
                    agreementAccepted={agreementAccepted}
                    onToggleSection={toggleSection}
                    onExpandAll={expandAll}
                    onCollapseAll={collapseAll}
                    onDownloadPDF={handleDownloadPDF}
                    onAgreementChange={(v) => setAgreementAccepted(v === true)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Payment action */}
          <div className="border-t-2 border-primary bg-gray-50/50 p-6 md:p-8">
            <PaymentAction
              agreementAccepted={agreementAccepted}
              isProcessingPayment={isProcessingPayment}
              onPaymentSubmit={handlePaymentSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProgramAgreementsSection() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ProgramAgreementContent />
    </Suspense>
  );
}
