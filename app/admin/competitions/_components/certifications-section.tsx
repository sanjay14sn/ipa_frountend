import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CertificationsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Certifications</CardTitle>
        <CardDescription>Manage competition certificates.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-10 text-muted-foreground">
          Certifications functionality coming soon.
        </div>
      </CardContent>
    </Card>
  );
}
