"use client";

import { CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * ProgramAgreementsSection — deprecated carousel.
 * The sign-agreement workflow has moved into ProgramsSection (programs tab).
 * This component is kept as a no-op stub so existing imports don't break.
 */
export function ProgramAgreementsSection() {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Sign agreements from the Programs tab
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 text-sm">
            Program agreements with status "PendingSignature" can now be signed
            directly from the <strong>Programs</strong> tab using the Sign button.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
