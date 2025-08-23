"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  StudentData,
  StudentLevel,
  StudentStream,
  StudentIdStatus,
} from "@/services/student.service";
import {
  User,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Calendar,
  Users,
  GraduationCap,
  CreditCard,
  AlertCircle,
} from "lucide-react";

interface StudentDetailsProps {
  student: StudentData;
}

export default function StudentDetails({ student }: StudentDetailsProps) {
  const getLevelColor = (level: StudentLevel) => {
    if (level.startsWith("EL")) return "bg-green-100 text-green-800";
    if (level.startsWith("RL")) return "bg-blue-100 text-blue-800";
    if (level.startsWith("GML")) return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  const getIdStatusColor = (status: StudentIdStatus) => {
    switch (status) {
      case StudentIdStatus.ISSUED:
        return "bg-green-100 text-green-800 border-green-200";
      case StudentIdStatus.REQUESTED:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case StudentIdStatus.NOT_ISSUED:
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="bg-gray-50 p-6 space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Student Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Roll Number</p>
            <p className="font-medium">{student.rollNo}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date of Birth</p>
            <p className="font-medium">
              {new Date(student.dateOfBirth).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gender</p>
            <p className="font-medium">{student.sex}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Standard</p>
            <p className="font-medium">{student.standard}</p>
          </div>
        </div>
      </div>

      {/* Parent Information */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Parent Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Father's Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{student.fatherName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Qualification</p>
                <p className="font-medium">{student.fatherQualification}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Occupation</p>
                <p className="font-medium">{student.fatherOccupation}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact Number</p>
                <p className="font-medium">{student.fatherContactNo}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mother's Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{student.motherName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Qualification</p>
                <p className="font-medium">{student.motherQualification}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Occupation</p>
                <p className="font-medium">{student.motherOccupation}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact Number</p>
                <p className="font-medium">{student.motherContactNo}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact & Address */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Contact & Address
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Email Address</p>
            <p className="font-medium">{student.mail}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Residential Address</p>
            <p className="font-medium">{student.residentialAddress}</p>
          </div>
        </div>
      </div>

      {/* Academic Status */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <BookOpen className="w-5 h-5 mr-2" />
          Academic Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="font-semibold text-blue-700">{student.level}</div>
            <div className="text-xs text-blue-600">Current Level</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="font-semibold text-green-700">{student.stream}</div>
            <div className="text-xs text-green-600">Stream</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="font-semibold text-purple-700">
              {student.isActive ? "Active" : "Inactive"}
            </div>
            <div className="text-xs text-purple-600">Status</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="font-semibold text-orange-700">
              {student.idIssued}
            </div>
            <div className="text-xs text-orange-600">ID Status</div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          System Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Created At</p>
            <p className="font-medium">
              {new Date(student.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Updated At</p>
            <p className="font-medium">
              {new Date(student.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created By</p>
            <p className="font-medium">{student.createdBy}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Updated By</p>
            <p className="font-medium">{student.updatedBy}</p>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className={`${getLevelColor(student.level)} border`}>
          {student.level}
        </Badge>
        <Badge className={`${getStatusColor(student.isActive)} border`}>
          {student.isActive ? "Active" : "Inactive"}
        </Badge>
        <Badge className={`${getIdStatusColor(student.idIssued)} border`}>
          ID: {student.idIssued}
        </Badge>
        <Badge variant="outline" className="border-blue-200 text-blue-700">
          {student.stream}
        </Badge>
      </div>
    </div>
  );
}
