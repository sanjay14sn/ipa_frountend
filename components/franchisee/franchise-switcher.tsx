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
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/user-context";

function getStatusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "active":
      return "border-transparent bg-green-100 text-green-800";
    case "pending":
      return "border-transparent bg-yellow-100 text-yellow-800";
    default:
      return "border-transparent bg-gray-100 text-gray-700";
  }
}

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

    setSwitching(true);
    try {
      await switchFranchise(franchiseId);
      router.refresh();
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
          return (
            <DropdownMenuItem
              key={franchise.id}
              className="flex cursor-pointer items-center justify-between gap-2 px-2 py-2"
              onClick={() => handleSwitch(franchise.id)}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Check
                  className={`h-4 w-4 shrink-0 text-primary ${isActive ? "opacity-100" : "opacity-0"}`}
                />
                <span className="truncate text-sm">{franchise.name}</span>
              </div>
              <Badge
                className={`shrink-0 text-xs ${getStatusBadgeClass(franchise.status)}`}
              >
                {franchise.status}
              </Badge>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
