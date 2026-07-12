enum NotificationType {
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

  // Order notifications
  ORDER_PLACED = 'order_placed',
  ORDER_UPDATED = 'order_updated',

  // Production backend notifications
  AGREEMENT_PENDING_SIGNATURE = 'AGREEMENT_PENDING_SIGNATURE',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  RECEIVABLE_ITEM_PAID = 'RECEIVABLE_ITEM_PAID',
  RECEIVABLE_REMINDER = 'RECEIVABLE_REMINDER',
  AGREEMENT_HOLD_APPLIED = 'AGREEMENT_HOLD_APPLIED',
  AGREEMENT_HOLD_CLEARED = 'AGREEMENT_HOLD_CLEARED',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_BACKORDERED = 'ORDER_BACKORDERED',
  LOW_STOCK = 'LOW_STOCK',
  REPLENISHMENT_DRAFT_CREATED = 'REPLENISHMENT_DRAFT_CREATED',
  CI_CREDENTIALS_ISSUED = 'CI_CREDENTIALS_ISSUED',
  CI_AGREEMENT_ISSUED = 'CI_AGREEMENT_ISSUED',
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
}

export type UserType = 'admin' | 'franchisee' | 'ci';

export interface Notification {
  id: number;
  recipientId: number;
  type: NotificationType | string;
  title?: string;
  message: string;
  action?: {
    label?: string;
    href?: string;
  };
  isRead: boolean;
  userType: UserType;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedNotifications {
  rows: Notification[] | Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationResponse {
  statusCode: number;
  timestamp: string;
  method: string;
  path: string;
  message: string;
  result:
    | Notification[]
    | PaginatedNotifications
    | Notification
    | { count: number }
    | number;
}
