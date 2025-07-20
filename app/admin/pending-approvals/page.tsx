"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  FileText,
  User,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Package,
  Users,
  Percent,
  RefreshCw,
  Gift,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function PendingApprovals() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState({
    franchiseeFee: "",
    dateOfPayment: "",
    dateOfJoining: "",
    kitCost: "",
    materialCost: "",
    monthlyFee: "",
    ciShare: "",
    franchiseeShare: "",
    royaltyGst: "",
    installments: "4",
    expiryDate: "",
    renewal: "",
    renewalDate: "",
    renewalAmount: "",
    promotionalMaterials: "",
  });
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [applicationsRes] = await Promise.all([
        fetch("/api/franchise-application"),
      ]);

      const [applicationsData] = await Promise.all([applicationsRes.json()]);

      setApplications(applicationsData.applications || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (
    applicationId: string,
    action: string
  ) => {
    if (action === "approve") {
      setSelectedApplication(
        applications.find((app: any) => app.id === applicationId)
      );
      setShowPaymentDialog(true);
    } else if (action === "reject") {
      await updateApplicationStatus(applicationId, "rejected");
    }
  };

  const updateApplicationStatus = async (
    applicationId: string,
    status: string,
    details?: any
  ) => {
    try {
      const response = await fetch("/api/franchise-application", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId,
          status,
          paymentDetails: details,
        }),
      });

      if (response.ok) {
        // If approved, create the franchise in the main franchise list
        if (status === "approved" && details) {
          await createFranchise(applicationId, details);
        }
        await fetchData();
        setShowPaymentDialog(false);
        setSelectedApplication(null);
        resetPaymentDetails();
      }
    } catch (error) {
      console.error("Error updating application:", error);
    }
  };

  const createFranchise = async (
    applicationId: string,
    paymentDetails: any
  ) => {
    try {
      const application = applications.find(
        (app: any) => app.id === applicationId
      );
      if (!application) return;

      // Generate unique franchise code
      const franchiseCode = `FC${Date.now()}`;

      const franchiseData = {
        id: franchiseCode,
        name: application.franchiseeName,
        email: application.emailId,
        phone: application.phoneNo,
        address: application.centreAddress,
        city: application.city,
        pincode: application.centrePincode,
        type: application.franchiseeType,
        program: application.programName,
        status: "Active",
        joinDate: paymentDetails.dateOfJoining,
        expiryDate: paymentDetails.expiryDate,
        paymentDetails,
        applicationId,
        // Additional franchise details
        franchiseCode,
        contactPerson: application.name,
        communicationAddress: application.communicationAddress,
        communicationPincode: application.communicationPincode,
        dob: application.dob,
        bloodGroup: application.bloodGroup,
        educationalQualification: application.educationalQualification,
        presentOccupation: application.presentOccupation,
        reference: application.reference,
        totalStudents: 0,
        totalInstructors: 0,
        totalOrders: 0,
        revenue: 0,
        // Login credentials
        loginEmail: application.emailId,
        loginPassword: `${franchiseCode}@123`, // Generate a default password
        role: "franchise",
        createdAt: new Date().toISOString(),
        // Onboarding status - new franchisees need to complete agreement/payment
        agreementAccepted: false,
        paymentCompleted: false,
        onboardingCompleted: false,
      };

      // Create franchise via API
      const response = await fetch("/api/franchises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(franchiseData),
      });

      if (response.ok) {
        // Show success message with login credentials
        alert(
          `Franchise created successfully!\n\nFranchise Code: ${franchiseCode}\nLogin Email: ${application.emailId}\nLogin Password: ${franchiseCode}@123\n\nPlease share these credentials with the franchise owner.`
        );
        console.log("Franchise created successfully");
      } else {
        console.error("Failed to create franchise");
        alert("Failed to create franchise. Please try again.");
      }
    } catch (error) {
      console.error("Error creating franchise:", error);
      alert("Error creating franchise. Please try again.");
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedApplication) return;

    await updateApplicationStatus(
      selectedApplication.id,
      "approved",
      paymentDetails
    );
  };

  const resetPaymentDetails = () => {
    setPaymentDetails({
      franchiseeFee: "",
      dateOfPayment: "",
      dateOfJoining: "",
      kitCost: "",
      materialCost: "",
      monthlyFee: "",
      ciShare: "",
      franchiseeShare: "",
      royaltyGst: "",
      installments: "4",
      expiryDate: "",
      renewal: "",
      renewalDate: "",
      renewalAmount: "",
      promotionalMaterials: "",
    });
  };

  const PaymentDetailsView = ({ paymentDetails }: { paymentDetails: any }) => {
    const totalFees =
      (parseFloat(paymentDetails.franchiseeFee) || 0) +
      (parseFloat(paymentDetails.kitCost) || 0) +
      (parseFloat(paymentDetails.materialCost) || 0);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <IndianRupee className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="text-xl font-bold text-blue-600">
                    ₹{totalFees.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Join Date</p>
                  <p className="font-semibold">
                    {paymentDetails.dateOfJoining
                      ? new Date(
                          paymentDetails.dateOfJoining
                        ).toLocaleDateString()
                      : "Not set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Installments</p>
                  <p className="font-semibold">
                    {paymentDetails.installments} Parts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <RefreshCw className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Renewal</p>
                  <p className="font-semibold">
                    {paymentDetails.renewal === "yes" ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fee Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-green-600" />
                Fee Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Franchisee Fee</span>
                  <span className="font-bold text-green-600">
                    ₹
                    {parseFloat(
                      paymentDetails.franchiseeFee || 0
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Kit Cost</span>
                  <span className="font-bold text-green-600">
                    ₹{parseFloat(paymentDetails.kitCost || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Material Cost (L2+)</span>
                  <span className="font-bold text-green-600">
                    ₹
                    {parseFloat(
                      paymentDetails.materialCost || 0
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Monthly Fee</span>
                  <span className="font-bold text-green-600">
                    ₹
                    {parseFloat(
                      paymentDetails.monthlyFee || 0
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-600" />
                Revenue Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium">CI Share</span>
                  <span className="font-bold text-blue-600">
                    {paymentDetails.ciShare}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium">Franchisee Share</span>
                  <span className="font-bold text-blue-600">
                    {paymentDetails.franchiseeShare}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium">Royalty + 18% GST</span>
                  <span className="font-bold text-blue-600">
                    ₹
                    {parseFloat(
                      paymentDetails.royaltyGst || 0
                    ).toLocaleString()}
                    /student
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Additional Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Payment Date
                </Label>
                <p className="font-medium mt-1">
                  {paymentDetails.dateOfPayment
                    ? new Date(
                        paymentDetails.dateOfPayment
                      ).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Expiry Date
                </Label>
                <p className="font-medium mt-1">
                  {paymentDetails.expiryDate
                    ? new Date(paymentDetails.expiryDate).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Promotional Materials
                </Label>
                <Badge variant="outline" className="mt-1">
                  {paymentDetails.promotionalMaterials || "None"}
                </Badge>
              </div>
              {paymentDetails.renewal === "yes" && (
                <>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Renewal Date
                    </Label>
                    <p className="font-medium mt-1">
                      {paymentDetails.renewalDate
                        ? new Date(
                            paymentDetails.renewalDate
                          ).toLocaleDateString()
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Renewal Amount
                    </Label>
                    <p className="font-medium mt-1 text-green-600">
                      ₹
                      {parseFloat(
                        paymentDetails.renewalAmount || 0
                      ).toLocaleString()}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-300"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "pending_approval":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pending Approval
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-300"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const ApplicationDetailsDialog = ({ application }: { application: any }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4 mr-1" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Application Details
          </DialogTitle>
          <p className="text-muted-foreground">
            Complete franchise application information
          </p>
        </DialogHeader>

        <div className="space-y-8">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Owner Name
                    </Label>
                    <p className="text-lg font-semibold text-gray-900">
                      {application.name || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Franchisee Name
                    </Label>
                    <p className="font-medium">{application.franchiseeName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Date of Birth
                    </Label>
                    <p className="font-medium">
                      {application.dob
                        ? new Date(application.dob).toLocaleDateString()
                        : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Blood Group
                    </Label>
                    <p className="font-medium">
                      {application.bloodGroup || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Email Address
                    </Label>
                    <p className="font-medium">{application.emailId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Phone Number
                    </Label>
                    <p className="font-medium">{application.phoneNo}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      City
                    </Label>
                    <p className="font-medium">{application.city}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Reference
                    </Label>
                    <p className="font-medium">
                      {application.reference || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Application Date
                    </Label>
                    <p className="font-medium">
                      {application.date
                        ? new Date(application.date).toLocaleDateString()
                        : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Submitted At
                    </Label>
                    <p className="font-medium">
                      {new Date(application.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Status
                    </Label>
                    <Badge
                      variant={
                        application.status === "approved"
                          ? "default"
                          : application.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                      className="mt-1"
                    >
                      {application.status?.charAt(0).toUpperCase() +
                        application.status?.slice(1) || "Pending"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Franchise Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Franchise Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Franchise Type
                    </Label>
                    <p className="font-medium">{application.franchiseeType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Program Name
                    </Label>
                    <p className="font-medium">{application.programName}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Educational Qualification
                    </Label>
                    <p className="font-medium">
                      {application.educationalQualification || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Present Occupation
                    </Label>
                    <p className="font-medium">
                      {application.presentOccupation || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Centre Address
                  </Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{application.centreAddress}</p>
                    {application.centrePincode && (
                      <p className="text-sm text-gray-600 mt-1">
                        PIN: {application.centrePincode}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Communication Address
                  </Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">
                      {application.communicationAddress ||
                        "Same as centre address"}
                    </p>
                    {application.communicationPincode && (
                      <p className="text-sm text-gray-600 mt-1">
                        PIN: {application.communicationPincode}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details (if approved) */}
          {application.status === "approved" && application.paymentDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentDetailsView
                  paymentDetails={application.paymentDetails}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Pending Applications
          </h1>
          <p className="text-gray-600">
            Review and approve franchise applications (
            {
              applications.filter(
                (app: any) => app.status === "pending_approval"
              ).length
            }{" "}
            pending)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Franchise Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    No applications found
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((application: any) => (
                  <TableRow key={application.id}>
                    <TableCell className="font-medium">
                      {application.franchiseeName}
                    </TableCell>
                    <TableCell>{application.emailId}</TableCell>
                    <TableCell>{application.franchiseeType}</TableCell>
                    <TableCell>{application.programName}</TableCell>
                    <TableCell>{application.city}</TableCell>
                    <TableCell>{getStatusBadge(application.status)}</TableCell>
                    <TableCell>
                      {new Date(application.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <ApplicationDetailsDialog application={application} />
                        {application.status === "pending_approval" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleApplicationAction(
                                  application.id,
                                  "approve"
                                )
                              }
                              className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleApplicationAction(
                                  application.id,
                                  "reject"
                                )
                              }
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Payment & Franchise Setup
            </DialogTitle>
            <p className="text-muted-foreground">
              Complete payment details to approve and create the franchise
              account
            </p>
          </DialogHeader>

          <div className="space-y-8">
            {/* Application Summary */}
            {selectedApplication && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Applicant Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">
                        Owner Name
                      </p>
                      <p className="font-semibold">
                        {selectedApplication.name ||
                          selectedApplication.franchiseeName}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">
                        Franchise Type
                      </p>
                      <p className="font-semibold">
                        {selectedApplication.franchiseeType}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">
                        Program
                      </p>
                      <p className="font-semibold">
                        {selectedApplication.programName}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-600 font-medium">
                        City
                      </p>
                      <p className="font-semibold">
                        {selectedApplication.city}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fee Structure */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-green-600" />
                    Fee Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="franchiseeFee">Franchisee Fee *</Label>
                      <Input
                        id="franchiseeFee"
                        type="number"
                        value={paymentDetails.franchiseeFee}
                        onChange={(e) =>
                          setPaymentDetails((prev) => ({
                            ...prev,
                            franchiseeFee: e.target.value,
                          }))
                        }
                        placeholder="Enter franchisee fee"
                        className="text-lg font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kitCost">Kit Cost *</Label>
                      <Input
                        id="kitCost"
                        type="number"
                        value={paymentDetails.kitCost}
                        onChange={(e) =>
                          setPaymentDetails((prev) => ({
                            ...prev,
                            kitCost: e.target.value,
                          }))
                        }
                        placeholder="Enter kit cost"
                        className="text-lg font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="materialCost">Material Cost (L2+)</Label>
                      <Input
                        id="materialCost"
                        type="number"
                        value={paymentDetails.materialCost}
                        onChange={(e) =>
                          setPaymentDetails((prev) => ({
                            ...prev,
                            materialCost: e.target.value,
                          }))
                        }
                        placeholder="Enter material cost"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyFee">Monthly Fee</Label>
                      <Input
                        id="monthlyFee"
                        type="number"
                        value={paymentDetails.monthlyFee}
                        onChange={(e) =>
                          setPaymentDetails((prev) => ({
                            ...prev,
                            monthlyFee: e.target.value,
                          }))
                        }
                        placeholder="Enter monthly fee"
                      />
                    </div>
                  </div>

                  {/* Total Calculation */}
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-green-800">
                        Total Initial Fee
                      </span>
                      <span className="text-2xl font-bold text-green-600">
                        ₹
                        {(
                          (parseFloat(paymentDetails.franchiseeFee) || 0) +
                          (parseFloat(paymentDetails.kitCost) || 0) +
                          (parseFloat(paymentDetails.materialCost) || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Sharing & Dates */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Percent className="w-5 h-5 text-blue-600" />
                      Revenue Sharing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ciShare">CI Share (%)</Label>
                        <Input
                          id="ciShare"
                          type="number"
                          value={paymentDetails.ciShare}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              ciShare: e.target.value,
                            }))
                          }
                          placeholder="Enter CI share"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="franchiseeShare">
                          Franchisee Share (%)
                        </Label>
                        <Input
                          id="franchiseeShare"
                          type="number"
                          value={paymentDetails.franchiseeShare}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              franchiseeShare: e.target.value,
                            }))
                          }
                          placeholder="Enter franchisee share"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="royaltyGst">
                        Royalty + 18% GST (per student)
                      </Label>
                      <Input
                        id="royaltyGst"
                        type="number"
                        value={paymentDetails.royaltyGst}
                        onChange={(e) =>
                          setPaymentDetails((prev) => ({
                            ...prev,
                            royaltyGst: e.target.value,
                          }))
                        }
                        placeholder="Enter royalty + GST"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      Important Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfPayment">Date of Payment *</Label>
                        <Input
                          id="dateOfPayment"
                          type="date"
                          value={paymentDetails.dateOfPayment}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              dateOfPayment: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                        <Input
                          id="dateOfJoining"
                          type="date"
                          value={paymentDetails.dateOfJoining}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              dateOfJoining: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={paymentDetails.expiryDate}
                        onChange={(e) =>
                          setPaymentDetails((prev) => ({
                            ...prev,
                            expiryDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Additional Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-600" />
                  Additional Options
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="installments">Payment Installments</Label>
                    <Select
                      value={paymentDetails.installments}
                      onValueChange={(value) =>
                        setPaymentDetails((prev) => ({
                          ...prev,
                          installments: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">
                          1 Installment (Full Payment)
                        </SelectItem>
                        <SelectItem value="2">2 Installments</SelectItem>
                        <SelectItem value="3">3 Installments</SelectItem>
                        <SelectItem value="4">4 Installments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="renewal">Renewal</Label>
                    <Select
                      value={paymentDetails.renewal}
                      onValueChange={(value) =>
                        setPaymentDetails((prev) => ({
                          ...prev,
                          renewal: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select renewal option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="promotionalMaterials">
                      Promotional Materials
                    </Label>
                    <Select
                      value={paymentDetails.promotionalMaterials}
                      onValueChange={(value) =>
                        setPaymentDetails((prev) => ({
                          ...prev,
                          promotionalMaterials: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select materials" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bag">Bag</SelectItem>
                        <SelectItem value="level1_kit">Level 1 Kit</SelectItem>
                        <SelectItem value="banners">Banners</SelectItem>
                        <SelectItem value="all">All Materials</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Renewal Details */}
                {paymentDetails.renewal === "yes" && (
                  <div className="mt-6 p-4 border border-dashed border-gray-300 rounded-lg">
                    <h4 className="font-medium mb-4 text-gray-900">
                      Renewal Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="renewalDate">Renewal Date</Label>
                        <Input
                          id="renewalDate"
                          type="date"
                          value={paymentDetails.renewalDate}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              renewalDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="renewalAmount">Renewal Amount</Label>
                        <Input
                          id="renewalAmount"
                          type="number"
                          value={paymentDetails.renewalAmount}
                          onChange={(e) =>
                            setPaymentDetails((prev) => ({
                              ...prev,
                              renewalAmount: e.target.value,
                            }))
                          }
                          placeholder="Enter renewal amount"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div className="text-sm text-gray-600">
                <p>* Required fields</p>
                <p>
                  This will create a new franchise account and send login
                  credentials to the applicant.
                </p>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  size="lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePaymentSubmit}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Approve & Create Franchise
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
