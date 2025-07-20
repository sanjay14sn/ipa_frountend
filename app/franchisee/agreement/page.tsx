"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  IndianRupee,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  CreditCard,
  Building2,
} from "lucide-react";
import { getUserFromStorage, saveUserToStorage } from "@/lib/auth";

export default function FranchiseAgreementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [franchiseData, setFranchiseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);

    if (userData?.role === "admin") {
      // Admins shouldn't be here
      router.push("/admin/dashboard");
      return;
    }

    if (userData?.onboardingCompleted) {
      // Already onboarded, redirect to dashboard
      router.push("/franchisee/dashboard");
      return;
    }

    if (userData?.franchiseId) {
      fetchFranchiseData(userData.franchiseId);
    }
  }, []);

  const fetchFranchiseData = async (franchiseId: string) => {
    try {
      const response = await fetch(
        `/api/franchises?franchiseId=${franchiseId}`
      );
      const data = await response.json();
      setFranchiseData(data.franchise);
    } catch (error) {
      console.error("Error fetching franchise data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!agreementAccepted) {
      alert("Please accept the terms and conditions before proceeding.");
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update franchise onboarding status
      const response = await fetch("/api/franchises/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          franchiseId: user.franchiseId,
          agreementAccepted: true,
          paymentCompleted: true,
          onboardingCompleted: true,
        }),
      });

      if (response.ok) {
        // Update user data in localStorage
        const updatedUser = {
          ...user,
          agreementAccepted: true,
          paymentCompleted: true,
          onboardingCompleted: true,
        };
        saveUserToStorage(updatedUser);
        setUser(updatedUser);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your franchise agreement...</p>
        </div>
      </div>
    );
  }

  if (!user || !franchiseData) {
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Calculator className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Franchise Agreement
          </h1>
          <p className="text-gray-600 mt-2">
            Please review your franchise details and complete the payment to get
            started
          </p>
        </div>

        <div className="space-y-6">
          {/* Franchise Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Franchise Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Franchise Name
                    </label>
                    <p className="font-semibold text-lg">
                      {franchiseData.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Franchise Code
                    </label>
                    <Badge variant="outline" className="ml-2">
                      {franchiseData.franchiseCode}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Program Type
                    </label>
                    <p className="font-medium">{franchiseData.program}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Contact Person
                    </label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{franchiseData.contactPerson}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Email
                    </label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{franchiseData.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Phone
                    </label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{franchiseData.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Centre Address
                  </label>
                  <p className="font-medium">{franchiseData.address}</p>
                  <p className="text-sm text-gray-500">
                    {franchiseData.city}, {franchiseData.pincode}
                  </p>
                </div>
                {franchiseData.communicationAddress && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Communication Address
                    </label>
                    <p className="font-medium">
                      {franchiseData.communicationAddress}
                    </p>
                    <p className="text-sm text-gray-500">
                      {franchiseData.communicationPincode}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {franchiseData.paymentDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">
                        Franchise Fee
                      </label>
                      <p className="text-2xl font-bold text-green-600">
                        ₹
                        {Number(
                          franchiseData.paymentDetails.franchiseeFee
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">
                        Kit Cost
                      </label>
                      <p className="text-2xl font-bold">
                        ₹
                        {Number(
                          franchiseData.paymentDetails.kitCost
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="text-sm font-medium text-gray-600">
                        Material Cost
                      </label>
                      <p className="text-2xl font-bold">
                        ₹
                        {Number(
                          franchiseData.paymentDetails.materialCost
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="text-lg font-semibold">
                    Total Amount Due
                  </span>
                  <span className="text-3xl font-bold text-blue-600">
                    ₹
                    {franchiseData.paymentDetails
                      ? (
                          Number(franchiseData.paymentDetails.franchiseeFee) +
                          Number(franchiseData.paymentDetails.kitCost) +
                          Number(franchiseData.paymentDetails.materialCost)
                        ).toLocaleString()
                      : "0"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agreement Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Agreement Terms & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                  <h4 className="font-semibold mb-2">
                    Franchise Agreement Terms:
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>
                      • This franchise agreement is valid for 2 years from the
                      date of joining
                    </li>
                    <li>
                      • Monthly royalty of{" "}
                      {franchiseData.paymentDetails?.royaltyGst}% on gross
                      revenue
                    </li>
                    <li>
                      • Franchisee share:{" "}
                      {franchiseData.paymentDetails?.franchiseeShare}%
                    </li>
                    <li>
                      • Agreement expires on:{" "}
                      {new Date(franchiseData.expiryDate).toLocaleDateString()}
                    </li>
                    <li>
                      • Payment can be made in{" "}
                      {franchiseData.paymentDetails?.installments} installments
                    </li>
                    <li>
                      • All training materials and support will be provided as
                      per agreement
                    </li>
                    <li>
                      • Franchisee must maintain quality standards as defined by
                      Abacus
                    </li>
                    <li>• Regular audits and assessments will be conducted</li>
                    <li>
                      • Renewal terms will be discussed 3 months before expiry
                    </li>
                  </ul>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="agreement"
                    checked={agreementAccepted}
                    onCheckedChange={setAgreementAccepted}
                  />
                  <label htmlFor="agreement" className="text-sm font-medium">
                    I have read and agree to all the terms and conditions
                    mentioned above
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Action */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Once you complete the payment, you will have full access to
                  your franchise dashboard where you can manage students, course
                  instructors, orders, and participate in contests.
                </p>
                <Button
                  onClick={handlePaymentSubmit}
                  disabled={!agreementAccepted || isProcessingPayment}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Complete Payment & Start Your Journey
                    </>
                  )}
                </Button>
                {!agreementAccepted && (
                  <p className="text-sm text-gray-500 mt-2">
                    Please accept the terms and conditions to proceed
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
