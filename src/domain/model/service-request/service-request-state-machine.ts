import { ServiceRequestStatus } from './service-request-status';

export enum ServiceRequestLifecycleAction {
  Triage = 'triage',
  Assign = 'assign',
  AcceptByTechnician = 'accept_by_technician',
  MarkTechnicianOnTheWay = 'mark_technician_on_the_way',
  StartWork = 'start_work',
  Complete = 'complete',
  Cancel = 'cancel',
}

type ServiceRequestTransitionTable = Record<
  ServiceRequestStatus,
  Partial<Record<ServiceRequestLifecycleAction, ServiceRequestStatus>>
>;

export class ServiceRequestStateMachine {
  private static readonly transitionTable: ServiceRequestTransitionTable = {
    [ServiceRequestStatus.Created]: {
      [ServiceRequestLifecycleAction.Triage]: ServiceRequestStatus.Triaged,
      [ServiceRequestLifecycleAction.Assign]: ServiceRequestStatus.Assigned,
      [ServiceRequestLifecycleAction.Cancel]: ServiceRequestStatus.Cancelled,
    },
    [ServiceRequestStatus.NeedsTriage]: {
      [ServiceRequestLifecycleAction.Triage]: ServiceRequestStatus.Triaged,
      [ServiceRequestLifecycleAction.Cancel]: ServiceRequestStatus.Cancelled,
    },
    [ServiceRequestStatus.Triaged]: {
      [ServiceRequestLifecycleAction.Assign]: ServiceRequestStatus.Assigned,
      [ServiceRequestLifecycleAction.Cancel]: ServiceRequestStatus.Cancelled,
    },
    [ServiceRequestStatus.Assigned]: {
      [ServiceRequestLifecycleAction.AcceptByTechnician]:
        ServiceRequestStatus.AcceptedByTechnician,
      [ServiceRequestLifecycleAction.Cancel]: ServiceRequestStatus.Cancelled,
    },
    [ServiceRequestStatus.AcceptedByTechnician]: {
      [ServiceRequestLifecycleAction.MarkTechnicianOnTheWay]:
        ServiceRequestStatus.TechnicianOnTheWay,
      [ServiceRequestLifecycleAction.Cancel]: ServiceRequestStatus.Cancelled,
    },
    [ServiceRequestStatus.TechnicianOnTheWay]: {
      [ServiceRequestLifecycleAction.StartWork]: ServiceRequestStatus.InProgress,
      [ServiceRequestLifecycleAction.Cancel]: ServiceRequestStatus.Cancelled,
    },
    [ServiceRequestStatus.InProgress]: {
      [ServiceRequestLifecycleAction.Complete]: ServiceRequestStatus.Completed,
      [ServiceRequestLifecycleAction.Cancel]: ServiceRequestStatus.Cancelled,
    },
    [ServiceRequestStatus.Completed]: {},
    [ServiceRequestStatus.Cancelled]: {},
    [ServiceRequestStatus.Failed]: {},
  };

  private constructor() {}

  static transition(
    from: ServiceRequestStatus,
    action: ServiceRequestLifecycleAction,
  ): ServiceRequestStatus | null {
    return ServiceRequestStateMachine.transitionTable[from][action] ?? null;
  }

  static canApply(from: ServiceRequestStatus, action: ServiceRequestLifecycleAction): boolean {
    return ServiceRequestStateMachine.transition(from, action) !== null;
  }

  static isTerminal(status: ServiceRequestStatus): boolean {
    return Object.keys(ServiceRequestStateMachine.transitionTable[status]).length === 0;
  }
}
