import useSWR, { mutate } from "swr";
import {
  getAllCourseInstructors,
  createCourseInstructor,
  updateCourseInstructor,
  deleteCourseInstructor,
  getAllAdminCourseInstructors,
  approveCourseInstructor,
  rejectCourseInstructor,
  CourseInstructorData,
  CourseInstructorsResponse,
  AdminCourseInstructorsByFranchise,
  AdminCourseInstructorsByStatus,
  AdminCourseInstructorData,
  CITrainingType,
  CreateCourseInstructorRequest,
  getAllCITraining,
  approveTraining,
  completeTraining,
  CITrainingData,
  CITrainingByFranchise,
  ApproveTrainingRequest,
  getTrainingCourseInstructors,
  TrainingCourseInstructorData,
} from "@/services/course-instructor.service";

const COURSE_INSTRUCTORS_KEY = "/course-instructor";
const TRAINING_COURSE_INSTRUCTORS_KEY = "/course-instructor/training";

// SWR fetcher function
const fetcher = async (): Promise<CourseInstructorData[]> => {
  const response = await getAllCourseInstructors();
  return response.result || [];
};

export function useCourseInstructors() {
  const { data, error, isLoading } = useSWR<CourseInstructorData[]>(
    COURSE_INSTRUCTORS_KEY,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const revalidate = () => mutate(COURSE_INSTRUCTORS_KEY);

  return {
    courseInstructors: data || [],
    isLoading,
    error,
    revalidate,
  };
}

// Helper function to create a course instructor with SWR revalidation
export async function createCourseInstructorWithRevalidation(
  courseInstructorData: CreateCourseInstructorRequest
): Promise<CourseInstructorData> {
  try {
    const newCourseInstructor = await createCourseInstructor(
      courseInstructorData
    );

    // Revalidate the course instructors list to include the new course instructor
    await mutate(COURSE_INSTRUCTORS_KEY);

    return newCourseInstructor;
  } catch (error) {
    console.error("Error creating course instructor:", error);
    throw error;
  }
}

// Helper function to update a course instructor with SWR revalidation
export async function updateCourseInstructorWithRevalidation(
  id: number,
  updates: Partial<CourseInstructorData>
): Promise<CourseInstructorData> {
  try {
    const updatedCourseInstructor = await updateCourseInstructor(id, updates);

    // Revalidate the course instructors list to reflect the changes
    await mutate(COURSE_INSTRUCTORS_KEY);

    return updatedCourseInstructor;
  } catch (error) {
    console.error("Error updating course instructor:", error);
    throw error;
  }
}

// Helper function to delete a course instructor with SWR revalidation
export async function deleteCourseInstructorWithRevalidation(
  id: number
): Promise<void> {
  try {
    await deleteCourseInstructor(id);

    // Revalidate the course instructors list to remove the deleted course instructor
    await mutate(COURSE_INSTRUCTORS_KEY);
  } catch (error) {
    console.error("Error deleting course instructor:", error);
    throw error;
  }
}

// Admin hooks and functions
const ADMIN_COURSE_INSTRUCTORS_KEY = "/course-instructor/all-admin";

// SWR fetcher function for admin data
const adminFetcher = async (): Promise<AdminCourseInstructorsByStatus> => {
  return await getAllAdminCourseInstructors();
};

export function useAdminCourseInstructors() {
  const { data, error, isLoading } = useSWR<AdminCourseInstructorsByStatus>(
    ADMIN_COURSE_INSTRUCTORS_KEY,
    adminFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const revalidate = () => mutate(ADMIN_COURSE_INSTRUCTORS_KEY);

  return {
    courseInstructors: data || {},
    isLoading,
    error,
    revalidate,
  };
}

// Helper function to approve a course instructor with SWR revalidation
export async function approveCourseInstructorWithRevalidation(
  id: number
): Promise<AdminCourseInstructorData> {
  try {
    const approvedCourseInstructor = await approveCourseInstructor(id);

    // Revalidate the admin course instructors list to reflect the changes
    await mutate(ADMIN_COURSE_INSTRUCTORS_KEY);

    return approvedCourseInstructor;
  } catch (error) {
    console.error("Error approving course instructor:", error);
    throw error;
  }
}

// Helper function to reject a course instructor with SWR revalidation
export async function rejectCourseInstructorWithRevalidation(
  id: number
): Promise<AdminCourseInstructorData> {
  try {
    const rejectedCourseInstructor = await rejectCourseInstructor(id);

    // Revalidate the admin course instructors list to reflect the changes
    await mutate(ADMIN_COURSE_INSTRUCTORS_KEY);

    return rejectedCourseInstructor;
  } catch (error) {
    console.error("Error rejecting course instructor:", error);
    throw error;
  }
}

// CI Training hooks and functions
const CI_TRAINING_KEY = "/ci-training/all";

// SWR fetcher function for CI training data
const ciTrainingFetcher = async (): Promise<CITrainingByFranchise> => {
  return await getAllCITraining();
};

export function useCITrainingData() {
  const { data, error, isLoading } = useSWR<CITrainingByFranchise>(
    CI_TRAINING_KEY,
    ciTrainingFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const revalidate = () => mutate(CI_TRAINING_KEY);

  return {
    trainingData: data || {},
    isLoading,
    error,
    revalidate,
  };
}

// Helper function to approve training with SWR revalidation
export async function approveTrainingWithRevalidation(
  instructorId: string,
  trainingData?: ApproveTrainingRequest
): Promise<void> {
  try {
    if (trainingData) {
      await approveTraining(instructorId, trainingData);
    }

    // Revalidate the CI training data to reflect the changes
    await mutate(CI_TRAINING_KEY);
  } catch (error) {
    console.error("Error approving training:", error);
    throw error;
  }
}

// Helper function to complete training with SWR revalidation
export async function completeTrainingWithRevalidation(
  id: number,
  data?: Parameters<typeof completeTraining>[1]
): Promise<void> {
  try {
    await completeTraining(id, data);

    // Revalidate the CI training data to reflect the changes
    await mutate(CI_TRAINING_KEY);
  } catch (error) {
    console.error("Error completing training:", error);
    throw error;
  }
}

// Training Course Instructor hooks and functions
// SWR fetcher function for training course instructors
const trainingFetcher = async (): Promise<TrainingCourseInstructorData[]> => {
  const response = await getTrainingCourseInstructors();
  return response.result || [];
};

export function useTrainingCourseInstructors() {
  const { data, error, isLoading } = useSWR<TrainingCourseInstructorData[]>(
    TRAINING_COURSE_INSTRUCTORS_KEY,
    trainingFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const revalidate = () => mutate(TRAINING_COURSE_INSTRUCTORS_KEY);

  return {
    trainingCourseInstructors: data || [],
    isLoading,
    error,
    revalidate,
  };
}

// Paginated Course Instructors hook
export function usePaginatedFranchiseeCourseInstructors(
  params: import("@/services/course-instructor.service").CourseInstructorPaginationParams
) {
  const key = `/course-instructor/paginated-franchisee?${JSON.stringify(params)}`;

  const { data, error, isLoading } = useSWR<
    import("@/services/course-instructor.service").PaginatedCourseInstructorsResponse
  >(
    key,
    () =>
      import("@/services/course-instructor.service").then((module) =>
        module.getPaginatedFranchiseeCourseInstructors(params)
      ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const revalidate = () => mutate(key);

  return {
    courseInstructors: data?.data || [],
    meta: data?.meta,
    isLoading,
    error,
    revalidate,
  };
}
