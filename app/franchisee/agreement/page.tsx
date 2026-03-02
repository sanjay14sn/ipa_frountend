"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useUser } from "@/context/user-context";
import {
  getProcessedAgreementContent,
  AgreementContent,
} from "@/lib/agreementContent";
import FranchiseeInformation from "./components/FranchiseeInformation";
import LocationDetails from "./components/LocationDetails";
import FranchiseDetails from "./components/FranchiseDetails";
import PaymentBreakdown from "./components/PaymentBreakdown";
import AgreementTerms from "./components/AgreementTerms";
import PaymentAction from "./components/PaymentAction";
import RazorpayPayment, {
  RazorpaySuccessResponse,
} from "@/components/RazorpayPayment";
import {
  initiateFranchiseFeePayment,
  verifyFranchiseFeePayment,
} from "@/services/franchisee.service";

export default function FranchiseAgreementPage() {
  const router = useRouter();
  const { user, setUser } = useUser();
  const [pageLoading, setPageLoading] = useState(true);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [agreementContent, setAgreementContent] =
    useState<AgreementContent | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<{
    orderId: string;
    amount: number;
    isZeroAmount?: boolean;
    currency: string;
    franchiseName: string;
    key: string;
  } | null>(null);

  useEffect(() => {
    if (user?.role === "admin") {
      router.push("/admin/dashboard");
      return;
    }

    if (user?.franchiseStatus === "Active") {
      router.push("/franchisee/dashboard");
      return;
    }

    if (user?.profile) {
      initializeAgreementContent();
    } else {
      setPageLoading(false);
    }
  }, [user]);

  const initializeAgreementContent = () => {
    if (!user?.profile) return;

    if (user.profile.franchise === undefined) {
      return;
    }

    const franchiseData = {
      name: user.profile.franchise?.name,
      contactPerson: user.profile.name,
      email: user.profile.mail,
      phone: user.profile.phone,
      dob: user.profile.dob,
      bloodGroup: user.profile.bloodGroup,
      educationalQualification: user.profile.education,
      presentOccupation: user.profile.occupation,
      address: user.profile.address,
      city: user.profile.city,
      state: user.profile.state,
      pincode: user.profile.pincode,
      communicationAddress: user.profile.communicationAddress,
      franchiseCode: `FR-${user.profile.franchise.id}`,
      program:
        user.profile.franchise.franchisePayrolls
          ?.map(
            (payroll: any) => payroll.franchiseProgram?.program?.name || "N/A",
          )
          .join(", ") || "N/A",
      franchiseType: user.profile.franchise.type,
      reference: user.profile.reference,
      date: user.profile.franchise.createdAt,
      // Support both new (per-program) and legacy (single) payroll
      paymentDetails:
        user.profile.franchise.franchisePayrolls ||
        (user.profile.franchise.franchisePayroll
          ? [user.profile.franchise.franchisePayroll]
          : []),
    } as any;

    const processedContent = getProcessedAgreementContent(franchiseData);
    setAgreementContent(processedContent);

    setExpandedSections(new Set(["basic-terms", "financial-terms"]));
    setPageLoading(false);
  };

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    setAgreementAccepted(checked === true);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const expandAllSections = () => {
    if (agreementContent) {
      setExpandedSections(new Set(agreementContent.sections.map((s) => s.id)));
    }
  };

  const collapseAllSections = () => {
    setExpandedSections(new Set());
  };

  const handleDownloadPDF = () => {
    const link = document.createElement("a");
    link.href = "/franchisee agreement pdf.pdf";
    link.download = "Franchisee_Agreement.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePaymentSubmit = async () => {
    if (!agreementAccepted) {
      alert("Please accept the terms and conditions before proceeding.");
      return;
    }

    if (!user?.franchiseId) {
      alert("Missing franchise information. Please re-login.");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const paymentOrder = await initiateFranchiseFeePayment(user.franchiseId);

      if (paymentOrder.isZeroAmount || paymentOrder.amount === 0) {
        if (user) {
          setUser({
            ...user,
            franchiseStatus: "Active",
          });
        }
        setShowPaymentSuccess(true);
        setIsProcessingPayment(false);
        setTimeout(() => {
          router.push("/franchisee/dashboard");
        }, 3000);
        return;
      }

      setPaymentDetails({
        orderId: paymentOrder.orderId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        franchiseName: paymentOrder.franchiseName,
        key: paymentOrder.key,
        isZeroAmount: paymentOrder.isZeroAmount,
      });
    } catch (error) {
      console.error("Error initiating payment:", error);
      alert("Failed to initiate payment. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (response: RazorpaySuccessResponse) => {
    try {
      const verificationResult = await verifyFranchiseFeePayment({
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      });

      if (verificationResult.message === "Payment verified successfully") {
        if (user) {
          setUser({
            ...user,
            franchiseStatus: "Active",
          });
        }
        setShowPaymentSuccess(true);

        setTimeout(() => {
          router.push("/franchisee/dashboard");
        }, 3000);
      } else {
        throw new Error("Payment verification failed");
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      alert("Payment verification failed. Please contact support.");
    } finally {
      setIsProcessingPayment(false);
      setPaymentDetails(null);
    }
  };

  const handlePaymentFailure = async (error: any) => {
    console.error("Payment failed:", error);

    if (paymentDetails?.orderId) {
      try {
        await verifyFranchiseFeePayment({
          paymentId: "",
          orderId: paymentDetails.orderId,
          signature: "",
        });
      } catch (err) {
        console.error("Error updating payment status:", err);
      }
    }

    alert("Payment failed. Please try again.");
    setIsProcessingPayment(false);
    setPaymentDetails(null);
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your franchise agreement...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.profile || !agreementContent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">
            Unable to load franchise data. Please try logging in again.
          </p>
          <Button onClick={() => router.push("/login")} className="mt-4">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  if (user.profile.franchise === undefined) {
    return;
  }

  const franchiseData = {
    name: user.profile.franchise.name,
    contactPerson: user.profile.name,
    email: user.profile.mail,
    phone: user.profile.phone,
    dob: user.profile.dob,
    bloodGroup: user.profile.bloodGroup,
    educationalQualification: user.profile.education,
    presentOccupation: user.profile.occupation,
    address: user.profile.address,
    city: user.profile.city,
    state: user.profile.state,
    pincode: user.profile.pincode,
    communicationAddress: user.profile.communicationAddress,
    franchiseCode: `FR-${user.profile.franchise.id}`,
    program:
      user.profile.franchise.franchisePayrolls
        ?.map(
          (payroll: any) => payroll.franchiseProgram?.program?.name || "N/A",
        )
        .join(", ") || "N/A",
    franchiseType: user.profile.franchise.type,
    reference: user.profile.reference,
    date: user.profile.franchise.createdAt,

    paymentDetails:
      user.profile.franchise.franchisePayrolls ||
      (user.profile.franchise.franchisePayroll
        ? [user.profile.franchise.franchisePayroll]
        : []),
  } as any;

  if (showPaymentSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Welcome to Abacus Family!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              Your payment has been processed successfully and your franchise
              onboarding is complete. You now have full access to manage your
              franchise operations.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to your dashboard in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 bg-gray-50">
      {paymentDetails &&
        user?.profile &&
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
            userDetails={{
              name: user.profile.name,
              email: user.profile.mail,
              phone: user.profile.phone,
            }}
          />
        )}
      <div className="w-full max-w-[1600px] mx-auto">
        {/* Professional Header */}
        <div className="border-2 rounded-xl border-primary shadow-xl bg-white">
          <div className="p-6 md:p-8 border-b-2 border-primary bg-primary/5 rounded-t-xl">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">
                Franchisee Agreement
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                Please review your franchise details and complete the payment to
                get started
              </p>
            </div>
          </div>

          {/* Multi-column professional layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 lg:min-h-[800px]">
            {/* Column 1 - All Details */}
            <div className="space-y-6 lg:col-span-2 p-6 md:p-8 bg-gray-50/50 lg:overflow-y-auto lg:max-h-[800px]">
              <FranchiseeInformation franchiseData={franchiseData} />
              <LocationDetails franchiseData={franchiseData} />
              <FranchiseDetails franchiseData={franchiseData} />
              <PaymentBreakdown paymentDetails={franchiseData.paymentDetails} />
            </div>

            {/* Column 2 - Agreement Terms */}
            <div className="lg:col-span-3 lg:border-l-2 border-primary p-6 md:p-8 flex flex-col lg:min-h-[800px]">
              <div className="flex-1 overflow-y-auto">
                <AgreementTerms
                  agreementContent={agreementContent}
                  expandedSections={expandedSections}
                  agreementAccepted={agreementAccepted}
                  onToggleSection={toggleSection}
                  onExpandAll={expandAllSections}
                  onCollapseAll={collapseAllSections}
                  onDownloadPDF={handleDownloadPDF}
                  onAgreementChange={handleCheckboxChange}
                />
              </div>
            </div>
          </div>

          {/* Payment Action Row - Spans Full Width */}
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
