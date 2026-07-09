"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Users } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { DialogFormField } from "@/components/shared/dialog";

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
          <DialogFormField id="fatherName" label="Father&apos;s Name *">
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
          </DialogFormField>

          <DialogFormField id="fatherContactNo" label="Father&apos;s Contact Number *">
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
          </DialogFormField>

          <DialogFormField id="fatherQualification" label="Father&apos;s Qualification">
            <Input
              id="fatherQualification"
              type="text"
              value={formData.fatherQualification}
              onChange={(e) =>
                onFieldChange("fatherQualification", e.target.value)
              }
              placeholder="e.g., B.Tech, MBA, etc."
            />
          </DialogFormField>

          <DialogFormField id="fatherOccupation" label="Father&apos;s Occupation">
            <Input
              id="fatherOccupation"
              type="text"
              value={formData.fatherOccupation}
              onChange={(e) => onFieldChange("fatherOccupation", e.target.value)}
              placeholder="e.g., Software Engineer, Teacher, etc."
            />
          </DialogFormField>
        </div>
      </div>

      {/* Mother's Information */}
      <div>
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Mother&apos;s Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DialogFormField id="motherName" label="Mother&apos;s Name *">
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
          </DialogFormField>

          <DialogFormField id="motherContactNo" label="Mother&apos;s Contact Number *">
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
          </DialogFormField>

          <DialogFormField id="motherQualification" label="Mother&apos;s Qualification">
            <Input
              id="motherQualification"
              type="text"
              value={formData.motherQualification}
              onChange={(e) =>
                onFieldChange("motherQualification", e.target.value)
              }
              placeholder="e.g., B.A., M.Sc., etc."
            />
          </DialogFormField>

          <DialogFormField id="motherOccupation" label="Mother&apos;s Occupation">
            <Input
              id="motherOccupation"
              type="text"
              value={formData.motherOccupation}
              onChange={(e) => onFieldChange("motherOccupation", e.target.value)}
              placeholder="e.g., Homemaker, Doctor, etc."
            />
          </DialogFormField>
        </div>
      </div>
    </div>
  );
}
