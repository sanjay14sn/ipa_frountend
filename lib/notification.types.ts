export enum NotificationType {
  // Student notifications
  STUDENT_ID_REQUESTED = 'student_id_requested',
  STUDENT_LEVEL_STUCK = 'student_level_stuck',
  STUDENT_REGISTERED = 'student_registered',

  // Franchise notifications
  FRANCHISE_APPLICATION_SUBMITTED = 'franchise_application_submitted',
  FRANCHISE_PAYMENT_PENDING = 'franchise_payment_pending',
  FRANCHISE_PAYMENT_RECEIVED = 'franchise_payment_received',

  // Course Instructor notifications
  CI_APPLICATION_SUBMITTED = 'ci_application_submitted',
  CI_TRAINING_REQUESTED = 'ci_training_requested',

  // Certificate notifications
  CERTIFICATE_REQUESTED = 'certificate_requested',

  STUDENT_ID_ISSUED = 'student_id_issued',
  STUDENT_DEACTIVATED = 'student_deactivated',
  STUDENT_REACTIVATED = 'student_reactivated',
  STUDENT_LEVEL_PROMOTED = 'student_level_promoted',

  FRANCHISE_APPROVED = 'franchise_approved',
  FRANCHISE_REJECTED = 'franchise_rejected',
  FRANCHISE_PAYMENT_DUE = 'franchise_payment_due',
  FRANCHISE_PAYMENT_CONFIRMED = 'franchise_payment_confirmed',

  CI_APPLICATION_APPROVED = 'ci_application_approved',
  CI_APPLICATION_REJECTED = 'ci_application_rejected',
  CI_TRAINING_APPROVED = 'ci_training_approved',
  CI_TRAINING_REJECTED = 'ci_training_rejected',
  CI_TRAINING_SCHEDULED = 'ci_training_scheduled',

  CERTIFICATE_APPROVED = 'certificate_approved',
  CERTIFICATE_REJECTED = 'certificate_rejected',
  E_CERTIFICATE_SENT = 'certificate_sent',
}

export type UserType = 'admin' | 'franchisee';

export interface Notification {
  id: number;
  recipientId: number;
  type: NotificationType;
  message: string;
  isRead: boolean;
  userType: UserType;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  result: Notification[] | Notification | { count: number };
}
