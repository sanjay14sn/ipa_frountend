export interface Franchise {
  id: string;
  name: string;
  location: string;
  owner: string;
  phone: string;
  email: string;
  students: number;
  courseInstructors: number; // Changed from faculty to courseInstructors
  status: "Active" | "Inactive";
  joinDate: string;
}

export interface Student {
  id: string;
  rollNo?: string; // System generated

  // Basic Information
  registrationType?: "new" | "existing";
  studentName: string;
  dob?: string;
  sex?: string;
  standard?: string;
  level: string;
  stream?: "regular" | "summer_camp";
  status: "Active" | "Inactive" | "active" | "inactive";

  // Parent Details
  fatherName?: string;
  fatherQualification?: string;
  fatherOccupation?: string;
  fatherContactNo?: string;

  motherName?: string;
  motherQualification?: string;
  motherOccupation?: string;
  motherContactNo?: string;

  // Contact Information
  residentialAddress?: string;
  mailId?: string;

  // Status Management
  isDiscontinued?: boolean;
  discontinueReason?: string;
  canRequestCertificate?: boolean;

  // Franchise Information
  franchiseId: string;
  franchiseName: string;

  // System Generated
  enrollmentDate: string;
  createdAt?: string;
  updatedAt?: string;

  // Photo
  photoPath?: string;

  // Legacy fields for compatibility
  name: string; // Keep for backward compatibility
  age: number;
}

export interface Order {
  id: string;
  franchiseId: string;
  franchise: string;
  type: "Materials" | "Contest Certificates" | "Grading Certificates";
  items: string;
  amount: string;
  status: "Pending" | "Processing" | "Shipped" | "Delivered";
  orderDate: string;
  expectedDelivery: string;
}

export interface Contest {
  id: string;
  name: string;
  date: string;
  location: string;
  participants: number;
  status: "Upcoming" | "Registration Open" | "Completed" | "Cancelled";
  registrationDeadline: string;
  levels: string[];
}

export interface CourseInstructor {
  id: string;
  name: string;
  photo?: string;
  date: string; // Application date
  centreName: string;
  programName:
    | "ABACUS"
    | "BRAIN TREE"
    | "PHONICS"
    | "BRITE"
    | "HANDWRITING"
    | "CREATIVE ARTS INDIA"
    | "VEDIC MATHS"
    | "ARKA KIDS";
  dob: string;
  bloodGroup: string;
  address: string;
  pincode: string;
  city: string;
  phone: string;
  email: string;
  educationalQualification: string;
  presentOccupation: string;
  reference: string;
  paymentDetails: {
    date: string;
    amount: number;
  };

  // Approval workflow
  status: "Pending" | "Approved" | "Rejected";
  uniqueCiCode?: string; // Generated after approval
  agreementGenerated: boolean;

  // CI Management
  franchiseId: string;
  franchiseName: string;
  ciFees: number;
  dateOfPayment: string;
  installment: 1 | 2 | 3 | 4 | 5 | 6;
  completedInstallments: number; // Number of installments completed
  dateOfJoining: string;
  ciShare: number; // percentage
  expiryDateOfAgreement: string;
  activeStatus: "Active" | "Inactive";

  // Training Details
  trainingLevels: {
    level:
      | "RL1"
      | "RL2"
      | "RL3"
      | "RL4"
      | "RL5"
      | "RL6"
      | "RL7"
      | "RL8"
      | "RL9"
      | "RL10"
      | "GML1"
      | "GML2"
      | "GML3";
    date: string;
    completed: boolean;
  }[];

  // Competition registration
  competitionRegn: string;

  // Legacy fields for existing data
  certification?: string;
  experience?: number;
  specialization?: string[];
}

// Dummy Data
export const FRANCHISES: Franchise[] = [
  {
    id: "1",
    name: "Abacus 1",
    location: "Mumbai, Maharashtra",
    owner: "Rajesh Sharma",
    phone: "+91 98765 43210",
    email: "rajesh@abacus1.com",
    students: 89,
    courseInstructors: 6,
    status: "Active",
    joinDate: "2022-01-15",
  },
];

export const STUDENTS: Student[] = [
  {
    id: "1",
    rollNo: "ABA24001",

    // Basic Information
    registrationType: "new",
    studentName: "Aarav Patel",
    dob: "2016-03-15",
    sex: "Male",
    standard: "3rd",
    level: "EL2",
    stream: "regular",
    status: "active",

    // Parent Details
    fatherName: "Rajesh Patel",
    fatherQualification: "B.Com",
    fatherOccupation: "Business Owner",
    fatherContactNo: "9876543210",

    motherName: "Priya Patel",
    motherQualification: "M.A. English",
    motherOccupation: "Teacher",
    motherContactNo: "9876543211",

    // Contact Information
    residentialAddress:
      "A-123, Shanti Nagar, Andheri West, Mumbai, Maharashtra - 400058",
    mailId: "rajesh.patel@email.com",

    // Status Management
    isDiscontinued: false,
    discontinueReason: "",
    canRequestCertificate: true,

    // Franchise Information
    franchiseId: "1",
    franchiseName: "Abacus 1",

    // System Generated
    enrollmentDate: "2024-01-15",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",

    // Photo
    photoPath: "students/ABA24001_photo.jpg",

    // Legacy fields
    name: "Aarav Patel",
    age: 8,
  },
  {
    id: "2",
    rollNo: "ABA24002",

    // Basic Information
    registrationType: "new",
    studentName: "Diya Sharma",
    dob: "2014-07-22",
    sex: "Female",
    standard: "5th",
    level: "RL3",
    stream: "regular",
    status: "active",

    // Parent Details
    fatherName: "Amit Sharma",
    fatherQualification: "B.Tech Computer Science",
    fatherOccupation: "Software Engineer",
    fatherContactNo: "9876543212",

    motherName: "Sunita Sharma",
    motherQualification: "B.Sc. Mathematics",
    motherOccupation: "Bank Manager",
    motherContactNo: "9876543213",

    // Contact Information
    residentialAddress:
      "B-456, Green Valley Society, Borivali East, Mumbai, Maharashtra - 400066",
    mailId: "amit.sharma@email.com",

    // Status Management
    isDiscontinued: false,
    discontinueReason: "",
    canRequestCertificate: true,

    // Franchise Information
    franchiseId: "1",
    franchiseName: "Abacus 1",

    // System Generated
    enrollmentDate: "2023-09-20",
    createdAt: "2023-09-20T14:15:00Z",
    updatedAt: "2023-09-20T14:15:00Z",

    // Photo
    photoPath: "students/ABA24002_photo.jpg",

    // Legacy fields
    name: "Diya Sharma",
    age: 10,
  },
  {
    id: "3",
    rollNo: "ABA24003",

    // Basic Information
    registrationType: "new",
    studentName: "Arjun Singh",
    dob: "2012-11-08",
    sex: "Male",
    standard: "7th",
    level: "RL8",
    stream: "regular",
    status: "active",

    // Parent Details
    fatherName: "Vikram Singh",
    fatherQualification: "MBA Finance",
    fatherOccupation: "Financial Advisor",
    fatherContactNo: "9876543214",

    motherName: "Kavita Singh",
    motherQualification: "M.A. Psychology",
    motherOccupation: "Counselor",
    motherContactNo: "9876543215",

    // Contact Information
    residentialAddress:
      "C-789, Royal Heights, Powai, Mumbai, Maharashtra - 400076",
    mailId: "vikram.singh@email.com",

    // Status Management
    isDiscontinued: false,
    discontinueReason: "",
    canRequestCertificate: true,

    // Franchise Information
    franchiseId: "1",
    franchiseName: "Abacus 1",

    // System Generated
    enrollmentDate: "2023-07-10",
    createdAt: "2023-07-10T11:20:00Z",
    updatedAt: "2023-07-10T11:20:00Z",

    // Photo
    photoPath: "students/ABA24003_photo.jpg",

    // Legacy fields
    name: "Arjun Singh",
    age: 12,
  },
  {
    id: "4",
    rollNo: "ABA24004",

    // Basic Information
    registrationType: "new",
    studentName: "Ananya Gupta",
    dob: "2015-05-12",
    sex: "Female",
    standard: "4th",
    level: "EL4",
    stream: "regular",
    status: "active",

    // Parent Details
    fatherName: "Suresh Gupta",
    fatherQualification: "CA",
    fatherOccupation: "Chartered Accountant",
    fatherContactNo: "9876543216",

    motherName: "Meera Gupta",
    motherQualification: "B.A. Arts",
    motherOccupation: "Homemaker",
    motherContactNo: "9876543217",

    // Contact Information
    residentialAddress:
      "D-321, Sunrise Apartments, Malad West, Mumbai, Maharashtra - 400064",
    mailId: "suresh.gupta@email.com",

    // Status Management
    isDiscontinued: false,
    discontinueReason: "",
    canRequestCertificate: true,

    // Franchise Information
    franchiseId: "1",
    franchiseName: "Abacus 1",

    // System Generated
    enrollmentDate: "2024-02-01",
    createdAt: "2024-02-01T09:45:00Z",
    updatedAt: "2024-02-01T09:45:00Z",

    // Photo
    photoPath: "students/ABA24004_photo.jpg",

    // Legacy fields
    name: "Ananya Gupta",
    age: 9,
  },
  {
    id: "5",
    rollNo: "ABA24005",

    // Basic Information
    registrationType: "new",
    studentName: "Karthik Reddy",
    dob: "2013-09-30",
    sex: "Male",
    standard: "6th",
    level: "RL5",
    stream: "regular",
    status: "active",

    // Parent Details
    fatherName: "Ramesh Reddy",
    fatherQualification: "B.E. Mechanical",
    fatherOccupation: "Engineer",
    fatherContactNo: "9876543218",

    motherName: "Lakshmi Reddy",
    motherQualification: "M.Sc. Chemistry",
    motherOccupation: "Lab Technician",
    motherContactNo: "9876543219",

    // Contact Information
    residentialAddress:
      "E-654, Ocean View, Versova, Mumbai, Maharashtra - 400061",
    mailId: "ramesh.reddy@email.com",

    // Status Management
    isDiscontinued: false,
    discontinueReason: "",
    canRequestCertificate: true,

    // Franchise Information
    franchiseId: "1",
    franchiseName: "Abacus 1",

    // System Generated
    enrollmentDate: "2023-11-05",
    createdAt: "2023-11-05T13:30:00Z",
    updatedAt: "2023-11-05T13:30:00Z",

    // Photo
    photoPath: "students/ABA24005_photo.jpg",

    // Legacy fields
    name: "Karthik Reddy",
    age: 11,
  },
];

export const ORDERS: Order[] = [
  {
    id: "ORD-001",
    franchiseId: "1",
    franchise: "Abacus 1",
    type: "Materials",
    items: "Abacus Sets (50), Workbooks (100)",
    amount: "₹25,000",
    status: "Pending",
    orderDate: "2024-01-15",
    expectedDelivery: "2024-01-22",
  },
  {
    id: "ORD-002",
    franchiseId: "1",
    franchise: "Abacus 1",
    type: "Contest Certificates",
    items: "Gold Certificates (25), Silver (50), Bronze (75)",
    amount: "₹8,500",
    status: "Processing",
    orderDate: "2024-01-14",
    expectedDelivery: "2024-01-20",
  },
  {
    id: "ORD-003",
    franchiseId: "1",
    franchise: "Abacus 1",
    type: "Grading Certificates",
    items: "Level 1-5 Certificates (200)",
    amount: "₹12,000",
    status: "Shipped",
    orderDate: "2024-01-12",
    expectedDelivery: "2024-01-18",
  },
  {
    id: "ORD-004",
    franchiseId: "1",
    franchise: "Abacus 1",
    type: "Materials",
    items: "Practice Books (150), Flash Cards (300)",
    amount: "₹18,750",
    status: "Delivered",
    orderDate: "2024-01-10",
    expectedDelivery: "2024-01-16",
  },
  {
    id: "ORD-1752754154512",
    franchiseId: "1",
    franchise: "Abacus 1",
    type: "Materials",
    items: "Intermediate Level Book (1 students), T-Shirt (S), Workbook",
    amount: "₹761.6",
    status: "Pending",
    orderDate: "2025-07-17",
    expectedDelivery: "",
  },
];

export const CONTESTS: Contest[] = [
  {
    id: "1",
    name: "National Abacus Championship 2024",
    date: "2024-03-15",
    location: "Abacus 1",
    participants: 245,
    status: "Upcoming",
    registrationDeadline: "2024-03-01",
    levels: ["Beginner", "Intermediate", "Advanced"],
  },
  {
    id: "2",
    name: "Regional Speed Contest",
    date: "2024-02-28",
    location: "Abacus 1",
    participants: 156,
    status: "Registration Open",
    registrationDeadline: "2024-02-20",
    levels: ["Intermediate", "Advanced"],
  },
  {
    id: "3",
    name: "Inter-Franchise Competition",
    date: "2024-01-20",
    location: "Abacus 1",
    participants: 89,
    status: "Completed",
    registrationDeadline: "2024-01-10",
    levels: ["All Levels"],
  },
];

export const COURSE_INSTRUCTORS: CourseInstructor[] = [
  {
    id: "1",
    name: "Dr. Meera Joshi",
    photo: "",
    date: "2023-01-15",
    centreName: "Abacus 1",
    programName: "ABACUS",
    dob: "1985-06-20",
    bloodGroup: "A+",
    address: "123 Main Street, Andheri",
    pincode: "400058",
    city: "Mumbai",
    phone: "+91 98765 43210",
    email: "meera.joshi@abacus.com",
    educationalQualification: "M.Sc Mathematics, B.Ed",
    presentOccupation: "Mathematics Teacher",
    reference: "Referred by Rajesh Sharma",
    paymentDetails: {
      date: "2023-01-20",
      amount: 25000,
    },
    status: "Approved",
    uniqueCiCode: "CI001",
    agreementGenerated: true,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    ciFees: 25000,
    dateOfPayment: "2023-01-20",
    installment: 1,
    completedInstallments: 1,
    dateOfJoining: "2023-02-01",
    ciShare: 40,
    expiryDateOfAgreement: "2025-02-01",
    activeStatus: "Active",
    trainingLevels: [
      { level: "RL1", date: "2023-02-15", completed: true },
      { level: "RL2", date: "2023-03-15", completed: true },
      { level: "RL3", date: "2023-04-15", completed: true },
      { level: "RL4", date: "2023-05-15", completed: true },
      { level: "RL5", date: "2023-06-15", completed: false },
    ],
    competitionRegn: "RL4",
    // Legacy fields
    certification: "Senior Abacus Instructor",
    experience: 8,
    specialization: ["Mental Math", "Speed Calculation"],
  },
  {
    id: "2",
    name: "Ramesh Kumar",
    photo: "",
    date: "2023-02-10",
    centreName: "Abacus 1",
    programName: "BRAIN TREE",
    dob: "1990-03-15",
    bloodGroup: "B+",
    address: "456 Park Road, Bandra",
    pincode: "400050",
    city: "Mumbai",
    phone: "+91 87654 32109",
    email: "ramesh.kumar@abacus.com",
    educationalQualification: "B.Sc Psychology",
    presentOccupation: "Child Development Specialist",
    reference: "Walk-in applicant",
    paymentDetails: {
      date: "2023-02-15",
      amount: 4000,
    },
    status: "Approved",
    uniqueCiCode: "CI002",
    agreementGenerated: true,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    ciFees: 24000,
    dateOfPayment: "2023-02-15",
    installment: 6, // 6 installment example
    completedInstallments: 1,
    dateOfJoining: "2023-03-01",
    ciShare: 35,
    expiryDateOfAgreement: "2025-03-01",
    activeStatus: "Active",
    trainingLevels: [
      { level: "RL1", date: "2023-03-10", completed: true },
      { level: "RL2", date: "2023-04-10", completed: true },
      { level: "RL3", date: "2023-05-10", completed: false },
    ],
    competitionRegn: "RL2",
    // Legacy fields
    certification: "Certified Abacus Trainer",
    experience: 5,
    specialization: ["Beginner Training", "Child Psychology"],
  },
  {
    id: "3",
    name: "Sunita Agarwal",
    photo: "",
    date: "2023-01-05",
    centreName: "Abacus 1",
    programName: "ABACUS",
    dob: "1980-11-25",
    bloodGroup: "O+",
    address: "789 Green Avenue, Andheri East",
    pincode: "400069",
    city: "Mumbai",
    phone: "+91 76543 21098",
    email: "sunita.agarwal@abacus.com",
    educationalQualification: "M.A Education, Abacus Certification",
    presentOccupation: "Independent Tutor",
    reference: "Previous franchise experience",
    paymentDetails: {
      date: "2023-01-10",
      amount: 30000,
    },
    status: "Approved",
    uniqueCiCode: "CI003",
    agreementGenerated: true,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    ciFees: 30000,
    dateOfPayment: "2023-01-10",
    installment: 1,
    completedInstallments: 1,
    dateOfJoining: "2023-01-20",
    ciShare: 45,
    expiryDateOfAgreement: "2025-01-20",
    activeStatus: "Active",
    trainingLevels: [
      { level: "RL1", date: "2023-02-01", completed: true },
      { level: "RL2", date: "2023-03-01", completed: true },
      { level: "RL3", date: "2023-04-01", completed: true },
      { level: "RL4", date: "2023-05-01", completed: true },
      { level: "RL5", date: "2023-06-01", completed: true },
      { level: "RL6", date: "2023-07-01", completed: true },
      { level: "RL7", date: "2023-08-01", completed: true },
      { level: "GML1", date: "2023-09-01", completed: true },
      { level: "GML2", date: "2023-10-01", completed: false },
    ],
    competitionRegn: "GML1",
    // Legacy fields
    certification: "Master Abacus Instructor",
    experience: 12,
    specialization: ["Advanced Techniques", "Competition Training"],
  },
  {
    id: "4",
    name: "Priya Sharma",
    photo: "",
    date: "2024-01-15",
    centreName: "Abacus 1",
    programName: "PHONICS",
    dob: "1992-08-12",
    bloodGroup: "AB+",
    address: "45 Powai, Mumbai",
    pincode: "400076",
    city: "Mumbai",
    phone: "+91 98123 45678",
    email: "priya.sharma@abacus.com",
    educationalQualification: "B.A English Literature, Phonics Certification",
    presentOccupation: "English Teacher",
    reference: "Online application",
    paymentDetails: {
      date: "2024-01-20",
      amount: 18000,
    },
    status: "Pending",
    uniqueCiCode: undefined,
    agreementGenerated: false,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    ciFees: 18000,
    dateOfPayment: "2024-01-20",
    installment: 1,
    completedInstallments: 0,
    dateOfJoining: "",
    ciShare: 0,
    expiryDateOfAgreement: "",
    activeStatus: "Inactive",
    trainingLevels: [],
    competitionRegn: "",
  },
  {
    id: "5",
    name: "Rajesh Patel",
    photo: "",
    date: "2024-01-10",
    centreName: "Abacus 1",
    programName: "VEDIC MATHS",
    dob: "1988-04-30",
    bloodGroup: "O-",
    address: "67 Kandivali West, Mumbai",
    pincode: "400067",
    city: "Mumbai",
    phone: "+91 87654 12345",
    email: "rajesh.patel@abacus.com",
    educationalQualification: "M.Sc Mathematics, Vedic Maths Specialist",
    presentOccupation: "Math Tutor",
    reference: "Referred by existing CI",
    paymentDetails: {
      date: "2024-01-15",
      amount: 22000,
    },
    status: "Approved",
    uniqueCiCode: "CI004",
    agreementGenerated: true,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    ciFees: 22000,
    dateOfPayment: "2024-01-15",
    installment: 1,
    completedInstallments: 1,
    dateOfJoining: "2024-02-01",
    ciShare: 42,
    expiryDateOfAgreement: "2026-02-01",
    activeStatus: "Active",
    trainingLevels: [
      { level: "RL1", date: "2024-02-10", completed: true },
      { level: "RL2", date: "2024-03-10", completed: true },
      { level: "RL3", date: "2024-04-10", completed: false },
    ],
    competitionRegn: "RL2",
  },
  {
    id: "6",
    name: "Anjali Reddy",
    photo: "",
    date: "2024-01-08",
    centreName: "Abacus 1",
    programName: "HANDWRITING",
    dob: "1995-02-18",
    bloodGroup: "A-",
    address: "123 Borivali East, Mumbai",
    pincode: "400066",
    city: "Mumbai",
    phone: "+91 99887 76543",
    email: "anjali.reddy@abacus.com",
    educationalQualification: "B.Ed, Handwriting Improvement Certificate",
    presentOccupation: "Primary School Teacher",
    reference: "School recommendation",
    paymentDetails: {
      date: "2024-01-12",
      amount: 3500,
    },
    status: "Approved",
    uniqueCiCode: "CI005",
    agreementGenerated: true,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    ciFees: 21000,
    dateOfPayment: "2024-01-12",
    installment: 6, // 6 installments
    completedInstallments: 1,
    dateOfJoining: "2024-02-15",
    ciShare: 38,
    expiryDateOfAgreement: "2026-02-15",
    activeStatus: "Active",
    trainingLevels: [
      { level: "RL1", date: "2024-02-20", completed: true },
      { level: "RL2", date: "2024-03-20", completed: false },
    ],
    competitionRegn: "RL1",
  },
  {
    id: "7",
    name: "Vikash Singh",
    photo: "",
    date: "2024-01-25",
    centreName: "Abacus 1",
    programName: "CREATIVE ARTS INDIA",
    dob: "1987-09-05",
    bloodGroup: "B-",
    address: "89 Juhu Beach Road, Mumbai",
    pincode: "400049",
    city: "Mumbai",
    phone: "+91 98765 11111",
    email: "vikash.singh@abacus.com",
    educationalQualification: "B.F.A, Art & Craft Diploma",
    presentOccupation: "Art Teacher",
    reference: "Art institute referral",
    paymentDetails: {
      date: "2024-01-28",
      amount: 5000,
    },
    status: "Pending",
    uniqueCiCode: undefined,
    agreementGenerated: false,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    ciFees: 20000,
    dateOfPayment: "2024-01-28",
    installment: 4, // 4 installments
    completedInstallments: 0,
    dateOfJoining: "",
    ciShare: 0,
    expiryDateOfAgreement: "",
    activeStatus: "Inactive",
    trainingLevels: [],
    competitionRegn: "",
  },
  {
    id: "8",
    name: "Kavya Nair",
    photo: "",
    date: "2023-12-20",
    centreName: "Abacus 1",
    programName: "ARKA KIDS",
    dob: "1993-11-14",
    bloodGroup: "AB-",
    address: "34 Malad West, Mumbai",
    pincode: "400064",
    city: "Mumbai",
    phone: "+91 87654 99999",
    email: "kavya.nair@abacus.com",
    educationalQualification:
      "B.Ed Early Childhood, Child Psychology Certificate",
    presentOccupation: "Pre-school Teacher",
    reference: "Educational fair",
    paymentDetails: {
      date: "2023-12-22",
      amount: 15000,
    },
    status: "Rejected",
    uniqueCiCode: undefined,
    agreementGenerated: false,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    ciFees: 15000,
    dateOfPayment: "2023-12-22",
    installment: 1,
    completedInstallments: 0,
    dateOfJoining: "",
    ciShare: 0,
    expiryDateOfAgreement: "",
    activeStatus: "Inactive",
    trainingLevels: [],
    competitionRegn: "",
  },
  {
    id: "9",
    name: "Amit Gupta",
    photo: "",
    date: "2023-08-15",
    centreName: "Abacus 1",
    programName: "BRITE",
    dob: "1986-06-25",
    bloodGroup: "O+",
    address: "78 Ghatkopar East, Mumbai",
    pincode: "400077",
    city: "Mumbai",
    phone: "+91 99123 45678",
    email: "amit.gupta@abacus.com",
    educationalQualification: "B.Tech, Educational Technology",
    presentOccupation: "Software Trainer",
    reference: "Career change applicant",
    paymentDetails: {
      date: "2023-08-20",
      amount: 8000,
    },
    status: "Approved",
    uniqueCiCode: "CI006",
    agreementGenerated: true,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    ciFees: 24000,
    dateOfPayment: "2023-08-20",
    installment: 3, // 3 installments
    completedInstallments: 1,
    dateOfJoining: "2023-09-01",
    ciShare: 40,
    expiryDateOfAgreement: "2025-09-01",
    activeStatus: "Inactive", // Inactive example
    trainingLevels: [
      { level: "RL1", date: "2023-09-15", completed: true },
      { level: "RL2", date: "2023-10-15", completed: true },
      { level: "RL3", date: "2023-11-15", completed: true },
      { level: "RL4", date: "2023-12-15", completed: true },
      { level: "RL5", date: "2024-01-15", completed: false },
      { level: "RL6", date: "", completed: false },
    ],
    competitionRegn: "RL4",
  },
  {
    id: "10",
    name: "Deepika Iyer",
    photo: "",
    date: "2024-01-30",
    centreName: "Abacus 1",
    programName: "ABACUS",
    dob: "1991-03-08",
    bloodGroup: "A+",
    address: "56 Worli, Mumbai",
    pincode: "400018",
    city: "Mumbai",
    phone: "+91 98876 54321",
    email: "deepika.iyer@abacus.com",
    educationalQualification: "M.Com, Abacus Teaching Certificate",
    presentOccupation: "Accountant",
    reference: "Corporate employee transition",
    paymentDetails: {
      date: "2024-02-02",
      amount: 12000,
    },
    status: "Pending",
    uniqueCiCode: undefined,
    agreementGenerated: false,
    franchiseId: "1",
    franchiseName: "Abacus 1",
    ciFees: 24000,
    dateOfPayment: "2024-02-02",
    installment: 2, // 2 installments
    completedInstallments: 0,
    dateOfJoining: "",
    ciShare: 0,
    expiryDateOfAgreement: "",
    activeStatus: "Inactive",
    trainingLevels: [],
    competitionRegn: "",
  },
];

// Legacy support - keeping FACULTY for backward compatibility
export const FACULTY = COURSE_INSTRUCTORS;
