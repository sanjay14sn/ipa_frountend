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
import { onboardingPayment } from "@/services/franchisee.service";

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
    new Set()
  );

  useEffect(() => {
    if (user?.role === "admin") {
      router.push("/admin/dashboard");
      return;
    }

    if (user?.franchiseStatus === "Active") {
      router.push("/franchisee/dashboard");
      return;
    }

    // Use profile data if available, otherwise show loading
    if (user?.profile) {
      initializeAgreementContent();
    } else {
      setPageLoading(false);
    }
  }, [user]);

  const initializeAgreementContent = () => {
    if (!user?.profile) return;

    // Create franchise data object from profile
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
      communicationAddress: user.profile.communicationAddress,
      franchiseCode: `FR-${user.profile.franchise.id}`,
      program: "ABACUS", // Default program
      franchiseType: user.profile.franchise.type,
      reference: user.profile.reference,
      date: user.profile.franchise.createdAt,
      paymentDetails: user.profile.franchise.franchisePayroll || {
        franchiseFee: 0,
        monthlyFee: 0,
        royalty: 0,
        kitCost: 0,
        materialCost: 0,
        installment: 0,
        ciShare: 0,
        franchiseShare: 0,
        totalAmount: 0,
        dateOfJoining: undefined,
        dateOfPayment: undefined,
      },
    } as any;

    // Process agreement content with franchise data
    const processedContent = getProcessedAgreementContent(franchiseData);
    setAgreementContent(processedContent);

    // Expand first two sections by default
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
      // Simulate payment processing
      const response = await onboardingPayment(user.franchiseId);

      if (response.statusCode === 201) {
        // Update user in context/localStorage
        setUser({
          ...user,
          franchiseStatus: "Active",
        });
        setShowPaymentSuccess(true);

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/franchisee/dashboard");
        }, 3000);
      } else {
        throw new Error("Failed to complete onboarding");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Payment processing failed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
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

  // Create franchise data object from profile for components
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
    communicationAddress: user.profile.communicationAddress,
    franchiseCode: `FR-${user.profile.franchise.id}`,
    program: "ABACUS", // Default program
    franchiseType: user.profile.franchise.type,
    reference: user.profile.reference,
    date: user.profile.franchise.createdAt,
    paymentDetails: user.profile.franchise.franchisePayroll || {
      franchiseFee: 0,
      monthlyFee: 0,
      royalty: 0,
      kitCost: 0,
      materialCost: 0,
      installment: 0,
      ciShare: 0,
      franchiseShare: 0,
      totalAmount: 0,
      dateOfJoining: undefined,
      dateOfPayment: undefined,
    },
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
    <div className="min-h-screen  p-8 bg-background">
      <div className="w-full">
        {/* Professional Header */}
        <div className="border rounded-lg border-primary shadow-lg bg-background/80">
          <div className=" p-6 border-b border-primary rounded-t-lg">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2 underline">
                Franchisee Agreement
              </h1>
              <p className="text-sm">
                Please review your franchise details and complete the payment to
                get started
              </p>
            </div>
          </div>

          {/* Multi-column professional layout */}
          <div className=" grid grid-cols-5 gap-8">
            {/* Column 1 - All Details */}
            <div className="space-y-6 col-span-2 p-8">
              <FranchiseeInformation franchiseData={franchiseData} />
              <LocationDetails franchiseData={franchiseData} />
              <FranchiseDetails franchiseData={franchiseData} />
              <PaymentBreakdown paymentDetails={franchiseData.paymentDetails} />
            </div>

            {/* Column 2 - Agreement Terms & Payment */}
            <div className="space-y-6 h-full flex flex-col col-span-3 border-l border-primary pl-8 pr-8">
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
              <div className="pb-8">
                <PaymentAction
                  agreementAccepted={agreementAccepted}
                  isProcessingPayment={isProcessingPayment}
                  onPaymentSubmit={handlePaymentSubmit}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
