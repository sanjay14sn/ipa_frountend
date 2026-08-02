"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type AdminRecord } from "@/services/admin.service";
import {
  useCreateAdmin,
  usePaginatedAdmins,
  useUpdateAdmin,
} from "@/hooks/api/admin.hooks";
import { useUser } from "@/context/user-context";
import {
  DataTable,
  type DataTableColumn,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  TableEmptyState,
  TableLoadingState,
  TablePageShell,
  TableSectionSurface,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/dialog";
import { ToggleField } from "@/components/shared/toggle-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldPlus, RefreshCw, PencilLine } from "lucide-react";
import { toast } from "sonner";
import statesCities from "@/data/indian-states-cities.json";
import { cn } from "@/lib/utils";
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { handleFormApiError } from "@/lib/form-errors";
import { useUniquenessCheck } from "@/hooks/api/uniqueness.hooks";
import { checkAdminAvailability } from "@/services/uniqueness.service";
import { sendClientLog } from "@/lib/client-telemetry";
import { formatDate } from "@/lib/date-utils";

type AdminFormMode = "create" | "edit";

interface AdminFormState {
  name: string;
  emailId: string;
  phone: string;
  password: string;
  state: string;
  warehouseName: string;
  warehouseAddress: string;
  warehouseCity: string;
  isActive: boolean;
}

const stateOptions = Object.keys(statesCities).sort();

const emptyForm: AdminFormState = {
  name: "",
  emailId: "",
  phone: "",
  password: "",
  state: "",
  warehouseName: "",
  warehouseAddress: "",
  warehouseCity: "",
  isActive: true,
};

const errorClass = "border-destructive focus-visible:ring-destructive";

export function AdminManagementSection() {
  const router = useRouter();
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<AdminFormMode>("create");
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [form, setForm] = useState<AdminFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Eager uniqueness checks — advisory red highlight while typing; the
  // submit path re-checks and reports field-level 409s on races.
  const uniquenessExcludeId =
    formMode === "edit" ? editingAdmin?.id : undefined;
  const emailUniq = useUniquenessCheck({
    keyParts: ["admin", "emailId"],
    value: form.emailId,
    enabled: /\S+@\S+\.\S+/.test(form.emailId),
    excludeId: uniquenessExcludeId,
    fetcher: (value, opts) => checkAdminAvailability("emailId", value, opts),
    takenMessage: "An admin with this email already exists.",
  });
  const nameUniq = useUniquenessCheck({
    keyParts: ["admin", "name"],
    value: form.name,
    enabled: form.name.trim().length > 0,
    excludeId: uniquenessExcludeId,
    fetcher: (value, opts) => checkAdminAvailability("name", value, opts),
    takenMessage: "An admin with this name already exists.",
  });

  // Merged view for rendering: base errors + live "taken" results.
  const displayErrors: Record<string, string> = { ...errors };
  if (nameUniq.error && !errors.name) displayErrors.name = nameUniq.error;
  if (emailUniq.error && !errors.emailId) {
    displayErrors.emailId = emailUniq.error;
  }

  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super";
  const adminListQuery = usePaginatedAdmins(
    {
      page: currentPage,
      limit: 10,
      search,
      sortBy: "id",
      sortOrder: "ASC",
    },
    isSuperAdmin,
  );
  const createAdminMutation = useCreateAdmin();
  const updateAdminMutation = useUpdateAdmin();

  const rows = adminListQuery.data?.data ?? [];
  const total = adminListQuery.data?.meta.total ?? 0;
  const totalPages = adminListQuery.data?.meta.totalPages ?? 1;
  const loading = adminListQuery.isLoading || adminListQuery.isFetching;
  const saving =
    createAdminMutation.isPending || updateAdminMutation.isPending;

  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.replace("/admin/dashboard");
    }
  }, [isSuperAdmin, router, user]);

  useEffect(() => {
    if (!adminListQuery.error) return;
    sendClientLog({ level: "error", event: "admins-load-error", message: "Failed to load admins", context: { error: adminListQuery.error } });
    toast.error(getUserFriendlyMessage(adminListQuery.error, "Failed to load admins"));
  }, [adminListQuery.error]);

  const openCreate = () => {
    setFormMode("create");
    setEditingAdmin(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (admin: AdminRecord) => {
    setFormMode("edit");
    setEditingAdmin(admin);
    setForm({
      name: admin.name,
      emailId: admin.emailId,
      phone: admin.phone,
      password: "",
      state: admin.state ?? "",
      warehouseName: "",
      warehouseAddress: "",
      warehouseCity: "",
      isActive: admin.isActive,
    });
    setDialogOpen(true);
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingAdmin(null);
    setForm(emptyForm);
    setErrors({});
  };

  const submit = async () => {
    const name = form.name.trim();
    const emailId = form.emailId.trim();
    const phone = form.phone.trim();
    const state = form.state.trim();
    const password = form.password.trim();
    const warehouseName = form.warehouseName.trim();

    if (!name || !emailId || !phone) {
      toast.error("Name, email, and phone are required");
      return;
    }

    if (formMode === "create" && (!state || !password || !warehouseName)) {
      toast.error("State, password, and warehouse name are required");
      return;
    }

    if (nameUniq.isTaken || emailUniq.isTaken) {
      setErrors((prev) => ({
        ...prev,
        ...(nameUniq.isTaken ? { name: nameUniq.error! } : {}),
        ...(emailUniq.isTaken ? { emailId: emailUniq.error! } : {}),
      }));
      return;
    }

    try {
      if (formMode === "create") {
        await createAdminMutation.mutateAsync({
          name,
          emailId,
          phone,
          password,
          state,
          warehouseName,
          warehouseAddress: form.warehouseAddress.trim() || undefined,
          warehouseCity: form.warehouseCity.trim() || undefined,
        });
        toast.success("Admin created");
      } else if (editingAdmin) {
        await updateAdminMutation.mutateAsync({
          adminId: editingAdmin.id,
          payload: {
            name,
            emailId,
            phone,
            password: password || undefined,
            state: editingAdmin.role === "staff" ? state : undefined,
            isActive: editingAdmin.role === "staff" ? form.isActive : undefined,
          },
        });
        toast.success("Admin updated");
      }
      resetDialog();
    } catch (error) {
      sendClientLog({ level: "error", event: "admin-save-error", message: "Failed to save admin", context: { error } });
      handleFormApiError(error, {
        setErrors,
        fieldMap: { emailId: "emailId", name: "name" },
        fallback: "Failed to save admin",
      });
    }
  };

  const columns = useMemo<DataTableColumn<AdminRecord>[]>(() => {
    return [
      {
        key: "admin",
        header: "Admin",
      },
      {
        key: "role",
        header: "Role",
        render: (admin) => (
          <Badge variant={admin.role === "super" ? "default" : "secondary"}>
            {admin.role === "super" ? "Superadmin" : "Regional admin"}
          </Badge>
        ),
      },
      {
        key: "state",
        header: "Region",
        render: (admin) => admin.state || "All regions",
      },
      {
        key: "status",
        header: "Status",
        className: "text-center",
        render: (admin) => (
          <Badge variant={admin.isActive ? "secondary" : "outline"}>
            {admin.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-[96px] text-center",
        render: (admin) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Edit admin"
            aria-label="Edit admin"
            onClick={(event) => {
              event.stopPropagation();
              openEdit(admin);
            }}
          >
            <PencilLine className="h-4 w-4" />
          </Button>
        ),
      },
    ];
  }, []);

  if (user && !isSuperAdmin) {
    return null;
  }

  return (
    <TablePageShell
      title="Admin Management"
      description="Create and maintain region-locked admins. Superadmin remains the fallback owner for unassigned regions."
      actions={
        <>
          <Button onClick={openCreate}>
            <ShieldPlus className="h-4 w-4" />
            Add admin
          </Button>
          <Button
            variant="outline"
            onClick={() => void adminListQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </>
      }
    >
      <TableSectionSurface>
        {loading ? (
          <TableLoadingState message="Loading admins..." />
        ) : rows.length === 0 ? (
          <TableEmptyState message="No admins found." />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(admin) => String(admin.id)}
            renderMainCell={(admin) => (
              <span className="font-medium text-foreground">{admin.name}</span>
            )}
            renderExpandedContent={(admin) => (
              <ExpandedDetailSurface>
                <ExpandedDetailSection title="Contact & access">
                  <DetailFieldsGrid columns={3}>
                    <DetailField label="Email" value={admin.emailId} />
                    <DetailField label="Phone" value={admin.phone} />
                    <DetailField
                      label="Role"
                      value={admin.role === "super" ? "Superadmin" : "Regional admin"}
                    />
                    <DetailField
                      label="Region"
                      value={admin.state || "All regions"}
                    />
                    <DetailField
                      label="Status"
                      value={admin.isActive ? "Active" : "Inactive"}
                    />
                    <DetailField label="Updated" value={formatDate(admin.updatedAt)} />
                  </DetailFieldsGrid>
                </ExpandedDetailSection>
              </ExpandedDetailSurface>
            )}
            searchPlaceholder="Search admins by name or email..."
            onSearchChange={(value) => {
              setCurrentPage(1);
              setSearch(value);
            }}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pagination={{ total, totalPages }}
            emptyMessage="No admins match your search."
            resultsText={(count, totalRows) =>
              `Showing ${count} of ${totalRows} admins`
            }
          />
        )}
      </TableSectionSurface>

      <FormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetDialog();
            return;
          }
          setDialogOpen(true);
        }}
        size="md"
        title={formMode === "create" ? "Create regional admin" : "Update admin"}
        description={
          formMode === "create"
            ? "Create a state-locked admin who runs operations from their own regional warehouse."
            : "Adjust contact details, region, password, or access status."
        }
        formId="admin-management-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        isSubmitting={saving}
        submitLabel={
          saving
            ? formMode === "create"
              ? "Creating..."
              : "Saving..."
            : formMode === "create"
              ? "Create admin"
              : "Save changes"
        }
        cancelLabel="Cancel"
      >
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-name">Name</Label>
              <Input
                id="admin-name"
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: "" }));
                  }
                }}
                className={cn(displayErrors.name && errorClass)}
              />
              {displayErrors.name ? (
                <p className="text-xs text-destructive">
                  {displayErrors.name}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={form.emailId}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    emailId: event.target.value,
                  }));
                  if (errors.emailId) {
                    setErrors((prev) => ({ ...prev, emailId: "" }));
                  }
                }}
                className={cn(displayErrors.emailId && errorClass)}
              />
              {displayErrors.emailId ? (
                <p className="text-xs text-destructive">
                  {displayErrors.emailId}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-phone">Phone</Label>
              <Input
                id="admin-phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-state">State</Label>
              <Select
                value={form.state}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, state: value }))
                }
                disabled={editingAdmin?.role === "super"}
              >
                <SelectTrigger id="admin-state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {stateOptions.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formMode === "create" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="admin-warehouse-name">Warehouse name</Label>
                  <Input
                    id="admin-warehouse-name"
                    value={form.warehouseName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        warehouseName: event.target.value,
                      }))
                    }
                    placeholder="e.g. Tamil Nadu Regional Warehouse"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="admin-warehouse-address">
                    Warehouse address
                  </Label>
                  <Input
                    id="admin-warehouse-address"
                    value={form.warehouseAddress}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        warehouseAddress: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="admin-warehouse-city">Warehouse city</Label>
                  <Input
                    id="admin-warehouse-city"
                    value={form.warehouseCity}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        warehouseCity: event.target.value,
                      }))
                    }
                  />
                </div>
              </>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="admin-password">
                {formMode === "create" ? "Password" : "Password reset"}
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder={
                  formMode === "create"
                    ? "Set initial password"
                    : "Leave blank to keep current password"
                }
              />
            </div>

            {formMode === "edit" && editingAdmin?.role !== "super" ? (
              <ToggleField
                label="Access"
                value={form.isActive ? "active" : "inactive"}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, isActive: v === "active" }))
                }
                options={[
                  {
                    value: "active",
                    label: "Active",
                    description: "This admin can sign in and access the portal.",
                  },
                  {
                    value: "inactive",
                    label: "Inactive",
                    description: "Sign-in is disabled. The admin keeps access history but cannot log in.",
                  },
                ]}
              />
            ) : null}
          </div>

      </FormDialog>
    </TablePageShell>
  );
}
