import { ServiceRequest } from '@domain/model';

export const SERVICE_REQUEST_REPOSITORY = Symbol('SERVICE_REQUEST_REPOSITORY');

export interface CreateServiceRequestAttachmentInput {
  fileName: string;
  mimeType: string;
  storageKey: string;
}

export interface ServiceRequestAttachmentSnapshot {
  id: string;
  serviceRequestId: string;
  uploadedByUserId: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  kind: string;
  createdAt?: Date;
}

export interface CreatedServiceRequest {
  request: ServiceRequest;
  requiredSkillIds: string[];
  attachments: ServiceRequestAttachmentSnapshot[];
}

export interface CreateServiceRequestPersistenceInput {
  request: ServiceRequest;
  requiredSkillIds: string[];
  attachments: CreateServiceRequestAttachmentInput[];
  actorUserId: string;
}

export interface ServiceRequestRepository {
  create(input: CreateServiceRequestPersistenceInput): Promise<CreatedServiceRequest>;
}
