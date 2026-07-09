"use client";

import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { ToggleField } from "@/components/shared/toggle-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BloodGroup } from "@/services/franchise.enums";
import { StateCitySelect } from "@/components/StateCitySelect";
import type { FranchiseeOption } from "@/services/franchisee.service";
import type { FormData, FranchiseeMode } from "./types";
import { DialogFormField } from "@/components/shared/dialog";

interface StepBasicInfoProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  franchiseeMode: FranchiseeMode;
  setFranchiseeMode: (mode: FranchiseeMode) => void;
  existingFranchiseeId: string;
  setExistingFranchiseeId: (id: string) => void;
  franchiseeOptions: FranchiseeOption[];
  franchiseeOptionsLoading: boolean;
}

export function StepBasicInfo({
  formData,
  setFormData,
  errors,
  setErrors,
  franchiseeMode,
  setFranchiseeMode,
  existingFranchiseeId,
  setExistingFranchiseeId,
  franchiseeOptions,
  franchiseeOptionsLoading,
}: StepBasicInfoProps) {
  return (
    <div className="space-y-4">
      <ToggleField
        tone="primary"
        label="Franchisee"
        value={franchiseeMode}
        onValueChange={(v) => setFranchiseeMode(v as FranchiseeMode)}
        options={[
          {
            value: "new",
            label: "Create new franchisee",
            description: "Capture the franchisee's personal details below.",
          },
          {
            value: "existing",
            label: "Attach existing franchisee",
            description:
              "Skip personal-info capture and link this franchise to a franchisee already in the system.",
          },
        ]}
      />
      {franchiseeMode === "existing" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DialogFormField id="existingFranchiseeId" label="Existing Franchisee *">
            <Select
              value={existingFranchiseeId}
              onValueChange={(value) => {
                setExistingFranchiseeId(value);
                if (errors.existingFranchiseeId)
                  setErrors({ ...errors, existingFranchiseeId: "" });
              }}
            >
              <SelectTrigger
                className={
                  errors.existingFranchiseeId ? "border-red-500" : ""
                }
              >
                <SelectValue
                  placeholder={
                    franchiseeOptionsLoading
                      ? "Loading…"
                      : "Select franchisee"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {franchiseeOptions.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name} ({f.mail})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.existingFranchiseeId && (
              <p className="text-red-500 text-sm">
                {errors.existingFranchiseeId}
              </p>
            )}
          </DialogFormField>
          <div className="space-y-2">
            <StateCitySelect
              stateValue={formData.state}
              value={formData.city}
              onStateChange={(state) => {
                setFormData({ ...formData, state, city: "" });
                if (errors.city) setErrors({ ...errors, city: "" });
              }}
              onChange={(city: string) => {
                setFormData({ ...formData, city });
                if (errors.city) setErrors({ ...errors, city: "" });
              }}
              error={errors.city}
            />
          </div>
        </div>
      )}
      {franchiseeMode === "new" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DialogFormField id="name" label="Full Name *">
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: "" });
                }}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name}</p>
              )}
            </DialogFormField>

            <DialogFormField id="email" label="Email *">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: "" });
                }}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}
            </DialogFormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DialogFormField id="phone" label="Phone *">
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.phone) setErrors({ ...errors, phone: "" });
                }}
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && (
                <p className="text-red-500 text-sm">{errors.phone}</p>
              )}
            </DialogFormField>

            <DialogFormField id="dob" label="Date of Birth">
              <DateInput
                id="dob"
                value={formData.dob}
                onChange={(v) => setFormData({ ...formData, dob: v })}
              />
            </DialogFormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DialogFormField id="bloodGroup" label="Blood Group">
              <Select
                value={formData.bloodGroup}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    bloodGroup: value as BloodGroup,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(BloodGroup).map((bg) => (
                    <SelectItem key={bg} value={bg}>
                      {bg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DialogFormField>

            <DialogFormField id="education" label="Education">
              <Input
                id="education"
                value={formData.education}
                onChange={(e) =>
                  setFormData({ ...formData, education: e.target.value })
                }
              />
            </DialogFormField>
          </div>

          <StateCitySelect
            id="city"
            value={formData.city}
            stateValue={formData.state}
            onChange={(val) => {
              setFormData({ ...formData, city: val });
              if (errors.city) setErrors({ ...errors, city: "" });
            }}
            onStateChange={(val) => {
              setFormData({ ...formData, state: val });
              if (errors.city) setErrors({ ...errors, city: "" });
            }}
            label="City"
            required
            error={errors.city}
          />

          <DialogFormField id="pincode" label="Pincode *">
            <Input
              id="pincode"
              inputMode="numeric"
              maxLength={6}
              value={formData.pincode}
              onChange={(e) => {
                setFormData({ ...formData, pincode: e.target.value });
                if (errors.pincode) setErrors({ ...errors, pincode: "" });
              }}
              className={errors.pincode ? "border-red-500" : ""}
            />
            {errors.pincode ? (
              <p className="text-red-500 text-sm">{errors.pincode}</p>
            ) : null}
          </DialogFormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DialogFormField id="communicationAddress" label="Communication Address">
              <Input
                id="communicationAddress"
                value={formData.communicationAddress}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    communicationAddress: e.target.value,
                  })
                }
              />
            </DialogFormField>

            <DialogFormField id="occupation" label="Occupation">
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) =>
                  setFormData({ ...formData, occupation: e.target.value })
                }
              />
            </DialogFormField>
          </div>

          <DialogFormField id="reference" label="Reference">
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) =>
                setFormData({ ...formData, reference: e.target.value })
              }
            />
          </DialogFormField>
        </>
      )}
    </div>
  );
}
