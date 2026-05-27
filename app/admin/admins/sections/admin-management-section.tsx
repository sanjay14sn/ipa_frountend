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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getUserFriendlyMessage } from "@/lib/error-utils";
import { sendClientLog } from "@/lib/client-telemetry";
import { formatDate } from "@/lib/date-utils";

type AdminFormMode = "create" | "edit";

interface AdminFormState {
  name: string;
  emailId: string;
  phone: string;
  password: string;
  state: string;
  isActive: boolean;
}

const stateOptions = Object.keys(
  statesCities as Record<string, string[]>,
).sort();

const emptyForm: AdminFormState = {
  name: "",
  emailId: "",
  phone: "",
  password: "",
  state: "",
  isActive: true,
};

export function AdminManagementSection() {
  const router = useRouter();
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState<AdminFormMode>("create");
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [form, setForm] = useState<AdminFormState>(emptyForm);

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
      isActive: admin.isActive,
    });
    setDialogOpen(true);
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingAdmin(null);
    setForm(emptyForm);
  };

  const submit = async () => {
    const name = form.name.trim();
    const emailId = form.emailId.trim();
    const phone = form.phone.trim();
    const state = form.state.trim();
    const password = form.password.trim();

    if (!name || !emailId || !phone) {
      toast.error("Name, email, and phone are required");
      return;
    }

    if (formMode === "create" && (!state || !password)) {
      toast.error("State and password are required");
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
      toast.error(getUserFriendlyMessage(error, "Failed to save admin"));
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetDialog();
            return;
          }
          setDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Create regional admin" : "Update admin"}
            </DialogTitle>
            <DialogDescription>
              {formMode === "create"
                ? "Create a state-locked admin who will own franchise applications for that region."
                : "Adjust contact details, region, password, or access status."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-name">Name</Label>
              <Input
                id="admin-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={form.emailId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, emailId: event.target.value }))
                }
              />
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

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving
                ? formMode === "create"
                  ? "Creating..."
                  : "Saving..."
                : formMode === "create"
                  ? "Create admin"
                  : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TablePageShell>
  );
}
