import { RequestPriority, ServiceRequestStatus } from '@domain/model';

export interface ServiceRequestCustomerSummary {
  id: string;
  fullName: string;
}

export interface ServiceRequestCustomerDetail extends ServiceRequestCustomerSummary {
  email: string;
  phone: string | null;
}

export interface ServiceRequestCategorySummary {
  id: string;
  code: string;
  name: string;
}

export interface ServiceRequestTypeSummary {
  id: string;
  code: string;
  name: string;
  isOther: boolean;
}

export interface ServiceRequestAddressSummary {
  id: string;
  city: string;
  line1: string;
}

export interface ServiceRequestServiceAreaSummary {
  id: string;
  code: string;
  name: string;
}

export interface ServiceRequestAddressDetail extends ServiceRequestAddressSummary {
  serviceArea: ServiceRequestServiceAreaSummary;
  line2: string | null;
  postalCode: string | null;
  notes: string | null;
}

export interface ServiceRequestSlaPolicySummary {
  id: string;
  code: string;
  name: string;
}

export interface ServiceRequestSkillSummary {
  id: string;
  code: string;
  name: string;
}

export interface ServiceRequestAttachmentSummary {
  id: string;
  uploadedByUserId: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  kind: string;
  createdAt: Date;
}

export interface ServiceRequestSummary {
  id: string;
  customer: ServiceRequestCustomerSummary;
  category: ServiceRequestCategorySummary;
  serviceType: ServiceRequestTypeSummary;
  address: ServiceRequestAddressSummary;
  status: ServiceRequestStatus;
  priority: RequestPriority;
  preferredStartAt: Date;
  preferredEndAt: Date;
  assignmentDeadlineAt: Date;
  completionDeadlineAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceRequestDetail {
  id: string;
  customer: ServiceRequestCustomerDetail;
  category: ServiceRequestCategorySummary;
  serviceType: ServiceRequestTypeSummary;
  address: ServiceRequestAddressDetail;
  slaPolicy: ServiceRequestSlaPolicySummary;
  status: ServiceRequestStatus;
  priority: RequestPriority;
  description: string;
  additionalContactInstructions: string | null;
  preferredStartAt: Date;
  preferredEndAt: Date;
  estimatedDurationMinutes: number;
  assignmentDeadlineAt: Date;
  completionDeadlineAt: Date;
  triagedAt: Date | null;
  assignedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  escalatedAt: Date | null;
  requiredSkills: ServiceRequestSkillSummary[];
  attachments: ServiceRequestAttachmentSummary[];
  createdAt: Date;
  updatedAt: Date;
}
