"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFormField, FormDialog } from "@/components/shared/dialog";
import { StateCitySelect } from "@/components/StateCitySelect";
import { BloodGroup } from "@/services/franchise.enums";
import { useUpdateFranchiseeAdmin } from "@/hooks/api/franchisee.hooks";

/** Structural subset of FranchiseeResponse — `mail` is the email column. */
export interface EditableFranchiseeDetails {
  id: number;
  name: string;
  dob?: Date | string | null;
  bloodGroup?: string | null;
  communicationAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  mail?: string | null;
  education?: string | null;
  occupation?: string | null;
  reference?: string | null;
}

interface EditFranchiseeDialogProps {
  franchisee: EditableFranchiseeDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FranchiseeFormState {
  name: string;
  dob: string;
  bloodGroup: string;
  phone: string;
  email: string;
  communicationAddress: string;
  city: string;
  state: string;
  pincode: string;
  education: string;
  occupation: string;
  reference: string;
}

const emptyForm: FranchiseeFormState = {
  name: "",
  dob: "",
  bloodGroup: "",
  phone: "",
  email: "",
  communicationAddress: "",
  city: "",
  state: "",
  pincode: "",
  education: "",
  occupation: "",
  reference: "",
};

function toDateInputValue(dob: Date | string | null | undefined): string {
  if (!dob) return "";
  if (dob instanceof Date) return dob.toISOString().slice(0, 10);
  return String(dob).slice(0, 10);
}

export function EditFranchiseeDialog({
  franchisee,
  open,
  onOpenChange,
}: EditFranchiseeDialogProps) {
  const [form, setForm] = useState<FranchiseeFormState>(emptyForm);
  const updateFranchisee = useUpdateFranchiseeAdmin();

  useEffect(() => {
    if (!franchisee) {
      setForm(emptyForm);
      return;
    }
    setForm({
      name: franchisee.name ?? "",
      dob: toDateInputValue(franchisee.dob),
      bloodGroup: franchisee.bloodGroup ?? "",
      phone: franchisee.phone ?? "",
      email: franchisee.mail ?? "",
      communicationAddress: franchisee.communicationAddress ?? "",
      city: franchisee.city ?? "",
      state: franchisee.state ?? "",
      pincode: franchisee.pincode ?? "",
      education: franchisee.education ?? "",
      occupation: franchisee.occupation ?? "",
      reference: franchisee.reference ?? "",
    });
  }, [franchisee]);

  const setField =
    (field: keyof FranchiseeFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const submit = async () => {
    if (!franchisee) return;
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!name || !phone || !email) {
      toast.error("Name, phone, and email are required");
      return;
    }
    if (!form.dob) {
      toast.error("Date of birth is required");
      return;
    }

    try {
      await updateFranchisee.mutateAsync({
        franchiseeId: franchisee.id,
        payload: {
          name,
          dob: form.dob,
          bloodGroup: form.bloodGroup,
          phone,
          email,
          communicationAddress: form.communicationAddress.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          education: form.education.trim(),
          occupation: form.occupation.trim(),
          reference: form.reference.trim(),
        },
      });
      toast.success("Franchisee updated");
      onOpenChange(false);
    } catch {
      // useUpdateFranchiseeAdmin already surfaces the error toast.
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Edit franchisee"
      description="Update the owner's identity and contact details. Changing the email changes what they log in with."
      formId="edit-franchisee-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      isSubmitting={updateFranchisee.isPending}
      submitLabel={updateFranchisee.isPending ? "Saving..." : "Save changes"}
      cancelLabel="Cancel"
    >
      <div className="space-y-4">
        <DialogFormField id="edit-franchisee-name" label="Name *">
          <Input
            id="edit-franchisee-name"
            value={form.name}
            onChange={setField("name")}
          />
        </DialogFormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <DialogFormField id="edit-franchisee-dob" label="Date of birth *">
            <Input
              id="edit-franchisee-dob"
              type="date"
              value={form.dob}
              onChange={setField("dob")}
            />
          </DialogFormField>

          <DialogFormField id="edit-franchisee-blood-group" label="Blood group">
            <Select
              value={form.bloodGroup}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, bloodGroup: value }))
              }
            >
              <SelectTrigger id="edit-franchisee-blood-group">
                <SelectValue placeholder="Select blood group" />
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DialogFormField id="edit-franchisee-phone" label="Phone *">
            <Input
              id="edit-franchisee-phone"
              value={form.phone}
              onChange={setField("phone")}
            />
          </DialogFormField>

          <DialogFormField id="edit-franchisee-email" label="Email *">
            <Input
              id="edit-franchisee-email"
              type="email"
              value={form.email}
              onChange={setField("email")}
            />
          </DialogFormField>
        </div>

        <DialogFormField
          id="edit-franchisee-address"
          label="Communication address"
        >
          <Input
            id="edit-franchisee-address"
            value={form.communicationAddress}
            onChange={setField("communicationAddress")}
          />
        </DialogFormField>

        <StateCitySelect
          id="edit-franchisee-city"
          value={form.city}
          stateValue={form.state}
          onChange={(city) => setForm((prev) => ({ ...prev, city }))}
          onStateChange={(state) => setForm((prev) => ({ ...prev, state }))}
          label="City"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <DialogFormField id="edit-franchisee-pincode" label="Pincode">
            <Input
              id="edit-franchisee-pincode"
              inputMode="numeric"
              maxLength={6}
              value={form.pincode}
              onChange={(event) => {
                const digitsOnly = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6);
                setForm((prev) => ({ ...prev, pincode: digitsOnly }));
              }}
              placeholder="6-digit pincode"
            />
          </DialogFormField>

          <DialogFormField id="edit-franchisee-education" label="Education">
            <Input
              id="edit-franchisee-education"
              value={form.education}
              onChange={setField("education")}
            />
          </DialogFormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DialogFormField id="edit-franchisee-occupation" label="Occupation">
            <Input
              id="edit-franchisee-occupation"
              value={form.occupation}
              onChange={setField("occupation")}
            />
          </DialogFormField>

          <DialogFormField id="edit-franchisee-reference" label="Reference">
            <Input
              id="edit-franchisee-reference"
              value={form.reference}
              onChange={setField("reference")}
            />
          </DialogFormField>
        </div>
      </div>
    </FormDialog>
  );
}
