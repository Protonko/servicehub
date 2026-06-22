import { ServiceRequestServiceAreaSummary, ServiceRequestSummary } from './service-request-read';

export enum DispatcherQueueSlaState {
  Breached = 'breached',
  AtRisk = 'at_risk',
  OnTrack = 'on_track',
}

export interface DispatcherQueueItem extends ServiceRequestSummary {
  serviceArea: ServiceRequestServiceAreaSummary;
  slaState: DispatcherQueueSlaState;
  relevantDeadlineAt: Date;
}
