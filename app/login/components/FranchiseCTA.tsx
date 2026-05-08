"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FranchiseCTA({
  onStartApplication,
}: {
  onStartApplication: () => void;
}) {
  return (
    <Card className="order-1 w-[300px] rounded-2xl border-border bg-card shadow-sm md:order-2">
      <CardHeader>
        <CardTitle className="pb-2 font-semibold text-[#065f46] underline decoration-primary/30 underline-offset-4">
          Become a Franchisee
        </CardTitle>
        <CardDescription>
          Apply in minutes. We'll review and get back to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="rounded-lg" onClick={onStartApplication}>
          Start Application
        </Button>
      </CardContent>
    </Card>
  );
}
