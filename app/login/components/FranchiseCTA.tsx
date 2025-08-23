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
    <Card className="order-1 border-border bg-card md:order-2">
      <CardHeader>
        <CardTitle className="text-primary pb-2 underline">
          Become a Franchisee
        </CardTitle>
        <CardDescription>
          Apply in minutes. We'll review and get back to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Streamlined process with clear next steps and timely updates.
        </div>
        <Button
          className="bg-brand-yellow-400 text-brand-green-600 hover:bg-brand-yellow-500"
          onClick={onStartApplication}
        >
          Start Application
        </Button>
      </CardContent>
    </Card>
  );
}
