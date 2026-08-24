import { StudentPracticePapersSection } from "@/components/competitions/student-practice-papers-section";

export default async function FranchiseeStudentPracticePapersPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const id = parseInt(studentId, 10);

  return (
    <div className="p-6">
      <StudentPracticePapersSection studentId={id} />
    </div>
  );
}
