"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared";
import { useUser } from "@/context/user-context";

export function FranchiseSwitcher() {
  const { user, switchFranchise } = useUser();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  // Hide if no franchises or only one franchise
  if (!user?.franchises || user.franchises.length <= 1) {
    return null;
  }

  const handleSwitch = async (franchiseId: string) => {
    if (franchiseId === user?.franchiseId || switching) return;
    // Find the franchise to check its status
    const franchise = user?.franchises?.find((f) => f.id === franchiseId);
    if (franchise?.status === "Pending") {
      toast.info("This franchise is pending admin approval");
      return;
    }

    setSwitching(true);
    try {
      await switchFranchise(franchiseId);
      router.refresh();  // Layout's useEffect handles redirect for Approved → /franchisee/agreement
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to switch franchise";
      toast.error(message);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-border text-sm text-primary hover:bg-accent hover:text-accent-foreground"
          disabled={switching}
        >
          {switching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          )}
          <span className="max-w-[140px] truncate">
            {user?.franchiseName ?? "Select Franchise"}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your Franchises
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.franchises.map((franchise) => {
          const isActive = franchise.id === user.franchiseId;
          const isPending = franchise.status === "Pending";
          return (
            <DropdownMenuItem
              key={franchise.id}
              className={`flex items-center justify-between gap-2 px-2 py-2 ${
                isPending ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
              disabled={isPending}
              onClick={() => !isPending && handleSwitch(franchise.id)}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Check
                  className={`h-4 w-4 shrink-0 text-primary ${isActive ? "opacity-100" : "opacity-0"}`}
                />
                <span className="truncate text-sm">{franchise.name}</span>
              </div>
              <StatusBadge className="shrink-0" label={franchise.status} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
