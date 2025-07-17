"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Calendar,
  CreditCard,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Users,
} from "lucide-react";
import { User as AuthUser, getUserFromStorage } from "@/lib/auth";
import { CourseInstructor, COURSE_INSTRUCTORS } from "@/lib/data";

export default function CourseInstructorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [instructor, setInstructor] = useState<CourseInstructor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);

    if (params.id) {
      // Find instructor by ID
      const foundInstructor = COURSE_INSTRUCTORS.find(
        (ci) => ci.id === params.id
      );
      setInstructor(foundInstructor || null);
    }
    setLoading(false);
  }, [params.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getActiveStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Inactive":
        return "bg-gray-50 text-gray-600 border-gray-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const handleApprove = async () => {
    if (!instructor) return;

    try {
      const response = await fetch(
        `/api/course-instructors/${instructor.id}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ciShare: 40,
            dateOfJoining: new Date().toISOString().split("T")[0],
            agreementDuration: 24,
          }),
        }
      );

      if (response.ok) {
        alert("Course Instructor approved successfully!");
        // Refresh page or update state
        window.location.reload();
      }
    } catch (error) {
      console.error("Error approving instructor:", error);
      alert("Failed to approve instructor");
    }
  };

  const handleReject = async () => {
    if (!instructor) return;

    try {
      const response = await fetch(
        `/api/course-instructors/${instructor.id}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "Application does not meet requirements",
          }),
        }
      );

      if (response.ok) {
        alert("Course Instructor application rejected.");
        // Refresh page or update state
        window.location.reload();
      }
    } catch (error) {
      console.error("Error rejecting instructor:", error);
      alert("Failed to reject instructor");
    }
  };

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

  if (!instructor) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            Course Instructor Not Found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            The requested course instructor could not be found.
          </p>
          <Button
            onClick={() => router.push("/dashboard/course-instructors")}
            className="mt-4"
          >
            Back to Course Instructors
          </Button>
        </div>
      </div>
    );
  }

  const completedLevels = instructor.trainingLevels.filter(
    (t) => t.completed
  ).length;
  const totalLevels = instructor.trainingLevels.length;
  const progressPercentage =
    totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/course-instructors")}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {instructor.name}
            </h1>
            <p className="text-gray-600 mt-1">Course Instructor Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant="outline"
            className={`${getStatusColor(instructor.status)}`}
          >
            {instructor.status}
          </Badge>
          {instructor.status === "Approved" && (
            <Badge
              variant="outline"
              className={`${getActiveStatusColor(instructor.activeStatus)}`}
            >
              {instructor.activeStatus}
            </Badge>
          )}
        </div>
      </div>

      {/* Admin Actions */}
      {user?.role === "admin" && instructor.status === "Pending" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Pending Approval
            </CardTitle>
            <CardDescription className="text-amber-700">
              This application is waiting for your review and approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-3">
              <Button
                onClick={handleApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Application
              </Button>
              <Button
                variant="outline"
                onClick={handleReject}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Application
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card className="border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-gray-900 flex items-center">
              <User className="mr-2 h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Date of Birth
                </label>
                <p className="text-sm text-gray-900">{instructor.dob}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Blood Group
                </label>
                <p className="text-sm text-gray-900">{instructor.bloodGroup}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <div className="flex items-center mt-1">
                <Mail className="mr-2 h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-900">{instructor.email}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <div className="flex items-center mt-1">
                <Phone className="mr-2 h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-900">{instructor.phone}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Address
              </label>
              <div className="flex items-start mt-1">
                <MapPin className="mr-2 h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-900">{instructor.address}</p>
                  <p className="text-sm text-gray-600">
                    {instructor.city}, {instructor.pincode}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card className="border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-gray-900 flex items-center">
              <GraduationCap className="mr-2 h-5 w-5" />
              Professional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Program
              </label>
              <Badge
                variant="outline"
                className="mt-1 bg-gray-50 border-gray-300 text-gray-700"
              >
                {instructor.programName}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Centre Name
              </label>
              <p className="text-sm text-gray-900">{instructor.centreName}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Educational Qualification
              </label>
              <p className="text-sm text-gray-900">
                {instructor.educationalQualification}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Present Occupation
              </label>
              <p className="text-sm text-gray-900">
                {instructor.presentOccupation}
              </p>
            </div>

            {instructor.reference && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Reference
                </label>
                <p className="text-sm text-gray-900">{instructor.reference}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CI Management Details */}
        {instructor.status === "Approved" && (
          <Card className="border-gray-200">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-gray-900 flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                CI Management
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    CI Code
                  </label>
                  <Badge
                    variant="outline"
                    className="mt-1 font-mono bg-slate-50 border-slate-300 text-slate-700"
                  >
                    {instructor.uniqueCiCode}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    CI Share
                  </label>
                  <p className="text-sm text-gray-900">{instructor.ciShare}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Date of Joining
                  </label>
                  <p className="text-sm text-gray-900">
                    {instructor.dateOfJoining}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Agreement Expiry
                  </label>
                  <p className="text-sm text-gray-900">
                    {instructor.expiryDateOfAgreement}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Franchise
                </label>
                <div className="flex items-center mt-1">
                  <Users className="mr-2 h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-900">
                    {instructor.franchiseName}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Information */}
        <Card className="border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-gray-900 flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  CI Fees
                </label>
                <p className="text-sm text-gray-900">
                  ₹{instructor.ciFees.toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Total Installments
                </label>
                <p className="text-sm text-gray-900">
                  {instructor.installment} installment(s)
                </p>
              </div>
            </div>

            {/* Installment Progress */}
            {instructor.status === "Approved" && instructor.installment > 0 && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700">
                    Installment Progress
                  </label>
                  <span className="text-sm font-medium text-gray-900">
                    {instructor.completedInstallments}/{instructor.installment}{" "}
                    completed
                  </span>
                </div>
                <Progress
                  value={
                    (instructor.completedInstallments /
                      instructor.installment) *
                    100
                  }
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>
                    Remaining:{" "}
                    {instructor.installment - instructor.completedInstallments}{" "}
                    installments
                  </span>
                  <span>
                    {instructor.completedInstallments === instructor.installment
                      ? "Fully Paid"
                      : "In Progress"}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Payment Date
                </label>
                <p className="text-sm text-gray-900">
                  {instructor.dateOfPayment}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Payment Amount
                </label>
                <p className="text-sm text-gray-900">
                  ₹{instructor.paymentDetails.amount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Progress */}
      {instructor.trainingLevels.length > 0 && (
        <Card className="border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-gray-900 flex items-center">
              <Award className="mr-2 h-5 w-5" />
              Training Progress
            </CardTitle>
            <CardDescription className="text-gray-600">
              Completed {completedLevels} of {totalLevels} training levels
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="text-gray-900">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instructor.trainingLevels.map((level, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    level.completed
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {level.level}
                    </span>
                    {level.completed ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  {level.date && (
                    <p className="text-xs text-gray-500 mt-1">{level.date}</p>
                  )}
                </div>
              ))}
            </div>

            {instructor.competitionRegn && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="text-sm font-medium text-blue-800">
                  Competition Registration Level
                </label>
                <p className="text-sm text-blue-700">
                  {instructor.competitionRegn}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Application Timeline */}
      <Card className="border-gray-200">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-gray-900 flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Application Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Application Submitted
                </p>
                <p className="text-xs text-gray-500">{instructor.date}</p>
              </div>
            </div>

            {instructor.status === "Approved" && (
              <>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Application Approved
                    </p>
                    <p className="text-xs text-gray-500">
                      CI Code: {instructor.uniqueCiCode}
                    </p>
                  </div>
                </div>

                {instructor.agreementGenerated && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Agreement Generated
                      </p>
                      <p className="text-xs text-gray-500">
                        Ready for training
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {instructor.status === "Rejected" && (
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Application Rejected
                  </p>
                  <p className="text-xs text-gray-500">
                    Does not meet requirements
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
