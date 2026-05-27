"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

export interface ContactInfoFieldsData {
  residentialAddress: string;
  mailId: string;
}

export interface ContactInfoFieldsProps {
  formData: ContactInfoFieldsData;
  errors: Record<string, string>;
  onFieldChange: (field: string, value: string) => void;
}

export function ContactInfoFields({
  formData,
  errors,
  onFieldChange,
}: ContactInfoFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="residentialAddress">Residential Address *</Label>
        <Textarea
          id="residentialAddress"
          value={formData.residentialAddress}
          onChange={(e) => onFieldChange("residentialAddress", e.target.value)}
          className={errors.residentialAddress ? "border-red-500" : ""}
          placeholder="Enter complete residential address"
          rows={3}
        />
        {errors.residentialAddress && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.residentialAddress}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mailId">Email Address *</Label>
        <Input
          id="mailId"
          type="email"
          value={formData.mailId}
          onChange={(e) => onFieldChange("mailId", e.target.value)}
          className={errors.mailId ? "border-red-500" : ""}
          placeholder="Enter email address"
        />
        {errors.mailId && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.mailId}
          </p>
        )}
      </div>
    </div>
  );
}
