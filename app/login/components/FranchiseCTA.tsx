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
    <Card className="order-1 border-border bg-card md:order-2 w-[300px]">
      <CardHeader>
        <CardTitle className="text-primary pb-2 underline">
          Become a Franchisee
        </CardTitle>
        <CardDescription>
          Apply in minutes. We'll review and get back to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="" onClick={onStartApplication}>
          Start Application
        </Button>
      </CardContent>
    </Card>
  );
}
