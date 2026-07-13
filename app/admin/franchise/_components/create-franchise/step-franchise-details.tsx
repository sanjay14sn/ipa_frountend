"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FranchiseType } from "@/services/franchise.enums";
import { StateCitySelect } from "@/components/StateCitySelect";
import { Checkbox } from "@/components/ui/checkbox";
import type { Program } from "@/services/program.service";
import type { FormData } from "./types";
import { DialogFormField } from "@/components/shared/dialog";

interface StepFranchiseDetailsProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  programs: Program[];
  onProgramToggle: (programId: number) => void;
}

export function StepFranchiseDetails({
  formData,
  setFormData,
  errors,
  setErrors,
  programs,
  onProgramToggle,
}: StepFranchiseDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DialogFormField id="franchiseName" label="Franchise Name *">
          <Input
            id="franchiseName"
            value={formData.franchiseName}
            onChange={(e) => {
              setFormData({ ...formData, franchiseName: e.target.value });
              if (errors.franchiseName)
                setErrors({ ...errors, franchiseName: "" });
            }}
            className={errors.franchiseName ? "border-red-500" : ""}
          />
          {errors.franchiseName && (
            <p className="text-red-500 text-sm">{errors.franchiseName}</p>
          )}
        </DialogFormField>

        <DialogFormField id="franchiseType" label="Franchise Type *">
          <Select
            value={formData.franchiseType}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                franchiseType: value as FranchiseType,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(FranchiseType).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogFormField>
      </div>

      <DialogFormField id="franchiseAddress" label="Franchise Address *">
        <Input
          id="franchiseAddress"
          value={formData.franchiseAddress}
          onChange={(e) => {
            setFormData({
              ...formData,
              franchiseAddress: e.target.value,
            });
            if (errors.franchiseAddress)
              setErrors({ ...errors, franchiseAddress: "" });
          }}
          className={errors.franchiseAddress ? "border-red-500" : ""}
        />
        {errors.franchiseAddress && (
          <p className="text-red-500 text-sm">{errors.franchiseAddress}</p>
        )}
      </DialogFormField>

      <StateCitySelect
        id="franchiseCity"
        value={formData.franchiseCity}
        stateValue={formData.franchiseState}
        onChange={(val) => {
          setFormData({ ...formData, franchiseCity: val });
          if (errors.franchiseCity)
            setErrors({ ...errors, franchiseCity: "" });
        }}
        onStateChange={(val) => {
          setFormData({ ...formData, franchiseState: val });
          if (errors.franchiseState)
            setErrors({ ...errors, franchiseState: "" });
        }}
        label="City"
        required
        error={errors.franchiseCity || errors.franchiseState}
      />

      <DialogFormField id="franchisePincode" label="Pincode">
        <Input
          id="franchisePincode"
          inputMode="numeric"
          maxLength={6}
          value={formData.franchisePincode}
          onChange={(e) => {
            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
            setFormData({ ...formData, franchisePincode: digitsOnly });
            if (errors.franchisePincode)
              setErrors({ ...errors, franchisePincode: "" });
          }}
          placeholder="6-digit pincode"
          className={errors.franchisePincode ? "border-red-500" : ""}
        />
        {errors.franchisePincode && (
          <p className="text-red-500 text-sm">{errors.franchisePincode}</p>
        )}
      </DialogFormField>

      <DialogFormField label="Programs * (Select one or more)">
        <div
          className={`border rounded-md p-4 space-y-3 ${
            errors.selectedPrograms ? "border-red-500" : "border-border"
          }`}
        >
          {programs.map((program) => (
            <div key={program.id} className="flex items-center space-x-2">
              <Checkbox
                id={`program-${program.id}`}
                checked={formData.selectedPrograms.includes(program.id)}
                onCheckedChange={() => onProgramToggle(program.id)}
              />
              <label
                htmlFor={`program-${program.id}`}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {program.name}
              </label>
            </div>
          ))}
        </div>
        {errors.selectedPrograms && (
          <p className="text-red-500 text-sm">{errors.selectedPrograms}</p>
        )}
      </DialogFormField>
    </div>
  );
}
