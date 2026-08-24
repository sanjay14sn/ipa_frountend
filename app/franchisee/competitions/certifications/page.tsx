import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function CertificationsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Certifications</CardTitle>
        <CardDescription>View competition certificates for your students.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-10 text-muted-foreground">
          Certifications functionality coming soon.
        </div>
      </CardContent>
    </Card>
  );
}

export default function FranchiseeCompetitionCertificationsPage() {
  return (
    <div className="p-6">
      <CertificationsSection />
    </div>
  );
}
