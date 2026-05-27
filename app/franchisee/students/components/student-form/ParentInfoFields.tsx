"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Users } from "lucide-react";
import { AlertCircle } from "lucide-react";

export interface ParentInfoFieldsData {
  fatherName: string;
  fatherQualification: string;
  fatherOccupation: string;
  fatherContactNo: string;
  motherName: string;
  motherQualification: string;
  motherOccupation: string;
  motherContactNo: string;
}

export interface ParentInfoFieldsProps {
  formData: ParentInfoFieldsData;
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
}

export function ParentInfoFields({
  formData,
  errors,
  onFieldChange,
}: ParentInfoFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Father's Information */}
      <div>
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          Father&apos;s Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fatherName">Father&apos;s Name *</Label>
            <Input
              id="fatherName"
              type="text"
              value={formData.fatherName}
              onChange={(e) => onFieldChange("fatherName", e.target.value)}
              className={errors.fatherName ? "border-red-500" : ""}
              placeholder="Enter father's full name"
            />
            {errors.fatherName && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.fatherName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fatherContactNo">Father&apos;s Contact Number *</Label>
            <Input
              id="fatherContactNo"
              type="tel"
              value={formData.fatherContactNo}
              onChange={(e) => onFieldChange("fatherContactNo", e.target.value)}
              className={errors.fatherContactNo ? "border-red-500" : ""}
              placeholder="Enter 10-digit contact number"
            />
            {errors.fatherContactNo && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.fatherContactNo}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fatherQualification">Father&apos;s Qualification</Label>
            <Input
              id="fatherQualification"
              type="text"
              value={formData.fatherQualification}
              onChange={(e) =>
                onFieldChange("fatherQualification", e.target.value)
              }
              placeholder="e.g., B.Tech, MBA, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fatherOccupation">Father&apos;s Occupation</Label>
            <Input
              id="fatherOccupation"
              type="text"
              value={formData.fatherOccupation}
              onChange={(e) => onFieldChange("fatherOccupation", e.target.value)}
              placeholder="e.g., Software Engineer, Teacher, etc."
            />
          </div>
        </div>
      </div>

      {/* Mother's Information */}
      <div>
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Mother&apos;s Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="motherName">Mother&apos;s Name *</Label>
            <Input
              id="motherName"
              type="text"
              value={formData.motherName}
              onChange={(e) => onFieldChange("motherName", e.target.value)}
              className={errors.motherName ? "border-red-500" : ""}
              placeholder="Enter mother's full name"
            />
            {errors.motherName && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.motherName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motherContactNo">Mother&apos;s Contact Number *</Label>
            <Input
              id="motherContactNo"
              type="tel"
              value={formData.motherContactNo}
              onChange={(e) => onFieldChange("motherContactNo", e.target.value)}
              className={errors.motherContactNo ? "border-red-500" : ""}
              placeholder="Enter 10-digit contact number"
            />
            {errors.motherContactNo && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.motherContactNo}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motherQualification">Mother&apos;s Qualification</Label>
            <Input
              id="motherQualification"
              type="text"
              value={formData.motherQualification}
              onChange={(e) =>
                onFieldChange("motherQualification", e.target.value)
              }
              placeholder="e.g., B.A., M.Sc., etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motherOccupation">Mother&apos;s Occupation</Label>
            <Input
              id="motherOccupation"
              type="text"
              value={formData.motherOccupation}
              onChange={(e) => onFieldChange("motherOccupation", e.target.value)}
              placeholder="e.g., Homemaker, Doctor, etc."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
