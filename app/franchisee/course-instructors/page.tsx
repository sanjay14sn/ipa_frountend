"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Plus,
  Users,
  GraduationCap,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Eye,
  BookOpen,
} from "lucide-react";
import { useUser } from "@/context/user-context";
import { CourseInstructorData } from "@/services/course-instructor.service";
import {
  useCourseInstructors,
  useTrainingCourseInstructors,
  deleteCourseInstructorWithRevalidation,
} from "@/hooks/use-course-instructors";
import AddCourseInstructorModal from "./components/AddCourseInstructorModal";
import CourseInstructorTabs from "./components/CourseInstructorTabs";

export default function FranchiseeCourseInstructorsPage() {
  const { user: contextUser } = useUser();
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedCourseInstructor, setSelectedCourseInstructor] =
    useState<CourseInstructorData | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editCourseInstructor, setEditCourseInstructor] =
    useState<CourseInstructorData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteCourseInstructorId, setDeleteCourseInstructorId] = useState<
    string | null
  >(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { user } = useUser();

  // Use SWR for data fetching
  const { courseInstructors, isLoading, revalidate } = useCourseInstructors();
  const {
    trainingCourseInstructors,
    isLoading: trainingLoading,
    revalidate: revalidateTraining,
  } = useTrainingCourseInstructors();

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  if (isLoading || trainingLoading) {
    return <div>Loading course instructors...</div>;
  }

  const activeCourseInstructors = courseInstructors.filter(
    (ci) => ci.status !== "Training"
  ).length;
  const trainingCount = trainingCourseInstructors.length;
  const newThisMonth = 0;

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: Date): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const CourseInstructorCard = ({
    courseInstructor,
  }: {
    courseInstructor: CourseInstructorData;
  }) => (
    <Card className="w-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{courseInstructor.name}</CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  CI-{courseInstructor.id}
                </Badge>
                <span>Age {calculateAge(courseInstructor.dob)}</span>
                <span>• {courseInstructor.bloodGroup}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              className="bg-primary/10 text-primary border-primary/20"
              variant="outline"
            >
              {courseInstructor.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <Phone className="w-4 h-4 mr-2" />
              Contact Details
            </h4>
            <div className="text-sm space-y-1">
              <p className="flex items-center">
                <Phone className="w-3 h-3 mr-1 text-muted-foreground" />
                {courseInstructor.phone}
              </p>
              <p className="flex items-center">
                <Mail className="w-3 h-3 mr-1 text-muted-foreground" />
                {courseInstructor.mail}
              </p>
              <p className="flex items-center">
                <MapPin className="w-3 h-3 mr-1 text-muted-foreground" />
                {courseInstructor.city}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              Professional Details
            </h4>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Education:</span>{" "}
                {courseInstructor.education}
              </p>
              <p>
                <span className="text-muted-foreground">Occupation:</span>{" "}
                {courseInstructor.occupation}
              </p>
              <p>
                <span className="text-muted-foreground">Reference:</span>{" "}
                {courseInstructor.reference}
              </p>
            </div>
          </div>
        </div>

        {/* Academic & Status */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <div className="text-sm font-medium">
                {new Date(courseInstructor.createdAt).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground">Joined</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <User className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <div className="text-sm font-medium">
                CI-{courseInstructor.id}
              </div>
              <div className="text-xs text-muted-foreground">ID</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <MapPin className="w-4 h-4 mx-auto mb-1 text-purple-600" />
              <div className="text-sm font-medium">{courseInstructor.city}</div>
              <div className="text-xs text-muted-foreground">Location</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCourseInstructor(courseInstructor);
              setIsDetailModalOpen(true);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditCourseInstructor(courseInstructor);
              setIsEditModalOpen(true);
            }}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeleteCourseInstructorId(courseInstructor.id.toString());
              setIsDeleteModalOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            My Course Instructors
          </h1>
          <p className="text-muted-foreground">
            Manage your franchise course instructors -{" "}
            {contextUser?.profile?.franchise?.name || user?.franchiseName}
            {contextUser?.profile && (
              <span className="block text-sm text-muted-foreground mt-1">
                Franchisee: {contextUser.profile.name} •{" "}
                {contextUser.profile.phone} • {contextUser.profile.city}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              Cards
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              Table
            </Button>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course Instructor
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Course Instructors
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseInstructors.length}</div>
            <p className="text-xs text-muted-foreground">In your franchise</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Instructors
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCourseInstructors}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Training</CardTitle>
            <BookOpen className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainingCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently in training
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New This Month
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newThisMonth}</div>
            <p className="text-xs text-muted-foreground">Recently added</p>
          </CardContent>
        </Card>
      </div>

      {/* Course Instructors Display */}
      {viewMode === "cards" ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {courseInstructors.map((courseInstructor) => (
              <CourseInstructorCard
                key={courseInstructor.id}
                courseInstructor={courseInstructor}
              />
            ))}
            {courseInstructors.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  No course instructors found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first course instructor.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Table View with Tabs
        <CourseInstructorTabs
          courseInstructors={courseInstructors}
          trainingCourseInstructors={trainingCourseInstructors}
          onCourseInstructorUpdate={(updatedCourseInstructor) => {
            revalidate();
          }}
          onCourseInstructorDelete={(courseInstructorId) => {
            setDeleteCourseInstructorId(courseInstructorId);
            setIsDeleteModalOpen(true);
          }}
          onCourseInstructorEdit={(courseInstructor) => {
            setEditCourseInstructor(courseInstructor);
            setIsEditModalOpen(true);
          }}
          onTrainingCourseInstructorUpdate={(updatedCourseInstructor) => {
            revalidateTraining();
          }}
          onTrainingCourseInstructorDelete={(courseInstructorId) => {
            setDeleteCourseInstructorId(courseInstructorId);
            setIsDeleteModalOpen(true);
          }}
          onTrainingCourseInstructorEdit={(courseInstructor) => {
            setEditCourseInstructor(courseInstructor as any);
            setIsEditModalOpen(true);
          }}
        />
      )}

      {/* Course Instructor Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Course Instructor Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedCourseInstructor?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedCourseInstructor && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Course Instructor Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID</p>
                    <p className="font-medium">
                      CI-{selectedCourseInstructor.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Date of Birth
                    </p>
                    <p className="font-medium">
                      {new Date(
                        selectedCourseInstructor.dob
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Blood Group</p>
                    <p className="font-medium">
                      {selectedCourseInstructor.bloodGroup}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">
                      {selectedCourseInstructor.city}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Contact Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">
                          {selectedCourseInstructor.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">
                          {selectedCourseInstructor.mail}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">
                          {selectedCourseInstructor.address}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Professional Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Education
                        </p>
                        <p className="font-medium">
                          {selectedCourseInstructor.education}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Occupation
                        </p>
                        <p className="font-medium">
                          {selectedCourseInstructor.occupation}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Reference
                        </p>
                        <p className="font-medium">
                          {selectedCourseInstructor.reference}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* System Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  System Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="font-semibold text-blue-700">
                      {new Date(
                        selectedCourseInstructor.createdAt
                      ).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-blue-600">Date Added</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="font-semibold text-green-700">
                      {new Date(
                        selectedCourseInstructor.updatedAt
                      ).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-green-600">Last Updated</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="font-semibold text-orange-700">
                      {selectedCourseInstructor.status}
                    </div>
                    <div className="text-xs text-orange-600">Status</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Course Instructor Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle>Delete Course Instructor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course instructor? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!user || !deleteCourseInstructorId) return;
                try {
                  await deleteCourseInstructorWithRevalidation(
                    Number(deleteCourseInstructorId)
                  );
                  setIsDeleteModalOpen(false);
                  setDeleteCourseInstructorId(null);
                } catch (error) {
                  console.error("Error deleting course instructor:", error);
                  alert("Failed to delete course instructor");
                }
              }}
            >
              Delete
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Course Instructor Modal */}
      <AddCourseInstructorModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          // Don't close modal immediately - let the modal handle its own success state
          revalidate(); // SWR will automatically refresh the data
        }}
      />
    </div>
  );
}
