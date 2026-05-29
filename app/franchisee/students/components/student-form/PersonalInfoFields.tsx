"use client";

import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { calculateAge } from "@/lib/date-utils";

export const STANDARDS = [
  "Pre-KG",
  "LKG",
  "UKG",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];

export interface PersonalInfoFieldsData {
  studentName: string;
  dob: string;
  dateOfJoining: string;
  sex: string;
  standard: string;
}

export interface PersonalInfoFieldsProps {
  formData: PersonalInfoFieldsData;
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
  /** When true, studentName and dob inputs are disabled (franchise edit mode). */
  lockIdentityFields?: boolean;
  /** When true, the dateOfJoining input is disabled (franchise edit mode). */
  lockDateOfJoining?: boolean;
  /** When true, dateOfJoining is required and shows an error slot. Defaults to false. */
  dateOfJoiningRequired?: boolean;
}

export function PersonalInfoFields({
  formData,
  errors,
  onFieldChange,
  lockIdentityFields = false,
  lockDateOfJoining = false,
  dateOfJoiningRequired = false,
}: PersonalInfoFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Student Name */}
      <div className="space-y-2">
        <Label htmlFor="studentName">Student Name *</Label>
        <Input
          id="studentName"
          type="text"
          value={formData.studentName}
          onChange={(e) => onFieldChange("studentName", e.target.value)}
          className={errors.studentName ? "border-red-500" : ""}
          placeholder="Enter student's full name"
          disabled={lockIdentityFields}
        />
        {errors.studentName && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.studentName}
          </p>
        )}
      </div>

      {/* Date of Birth */}
      <div className="space-y-2">
        <Label htmlFor="dob">
          Date of Birth *
          {formData.dob && (
            <span className="ml-2 text-muted-foreground font-normal">
              ({calculateAge(formData.dob)} yrs old)
            </span>
          )}
        </Label>
        <DateInput
          id="dob"
          value={formData.dob}
          onChange={(v) => onFieldChange("dob", v)}
          className={errors.dob ? "border-red-500" : ""}
          disabled={lockIdentityFields}
        />
        {errors.dob && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.dob}
          </p>
        )}
      </div>

      {/* Date of Joining */}
      <div className="space-y-2">
        <Label htmlFor="dateOfJoining">
          Date of Joining {dateOfJoiningRequired ? "*" : ""}
        </Label>
        <DateInput
          id="dateOfJoining"
          value={formData.dateOfJoining}
          onChange={(v) => onFieldChange("dateOfJoining", v)}
          className={errors.dateOfJoining ? "border-red-500" : ""}
          disabled={lockDateOfJoining}
        />
        {errors.dateOfJoining && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.dateOfJoining}
          </p>
        )}
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label htmlFor="sex">Gender *</Label>
        <Select
          value={formData.sex}
          onValueChange={(value) => onFieldChange("sex", value)}
        >
          <SelectTrigger className={errors.sex ? "border-red-500" : ""}>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
          </SelectContent>
        </Select>
        {errors.sex && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.sex}
          </p>
        )}
      </div>

      {/* Standard */}
      <div className="space-y-2">
        <Label htmlFor="standard">Standard *</Label>
        <Select
          value={formData.standard}
          onValueChange={(value) => onFieldChange("standard", value)}
        >
          <SelectTrigger className={errors.standard ? "border-red-500" : ""}>
            <SelectValue placeholder="Select standard" />
          </SelectTrigger>
          <SelectContent>
            {STANDARDS.map((standard) => (
              <SelectItem key={standard} value={standard}>
                {standard}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.standard && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.standard}
          </p>
        )}
      </div>
    </div>
  );
}
