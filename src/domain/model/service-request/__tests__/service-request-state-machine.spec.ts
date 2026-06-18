import {
  ServiceRequestLifecycleAction,
  ServiceRequestStateMachine,
} from '../service-request-state-machine';
import { ServiceRequestStatus } from '../service-request-status';

describe('ServiceRequestStateMachine', () => {
  it('resolves expected request lifecycle actions to next statuses', () => {
    expect(
      ServiceRequestStateMachine.transition(
        ServiceRequestStatus.Created,
        ServiceRequestLifecycleAction.Assign,
      ),
    ).toBe(ServiceRequestStatus.Assigned);
    expect(
      ServiceRequestStateMachine.transition(
        ServiceRequestStatus.NeedsTriage,
        ServiceRequestLifecycleAction.Triage,
      ),
    ).toBe(ServiceRequestStatus.Triaged);
    expect(
      ServiceRequestStateMachine.transition(
        ServiceRequestStatus.Assigned,
        ServiceRequestLifecycleAction.AcceptByTechnician,
      ),
    ).toBe(ServiceRequestStatus.AcceptedByTechnician);
    expect(
      ServiceRequestStateMachine.transition(
        ServiceRequestStatus.InProgress,
        ServiceRequestLifecycleAction.Complete,
      ),
    ).toBe(ServiceRequestStatus.Completed);
  });

  it('rejects invalid lifecycle shortcuts and terminal transitions', () => {
    expect(
      ServiceRequestStateMachine.transition(
        ServiceRequestStatus.NeedsTriage,
        ServiceRequestLifecycleAction.Assign,
      ),
    ).toBeNull();
    expect(
      ServiceRequestStateMachine.transition(
        ServiceRequestStatus.Assigned,
        ServiceRequestLifecycleAction.StartWork,
      ),
    ).toBeNull();
    expect(
      ServiceRequestStateMachine.transition(
        ServiceRequestStatus.Completed,
        ServiceRequestLifecycleAction.Cancel,
      ),
    ).toBeNull();
    expect(
      ServiceRequestStateMachine.canApply(
        ServiceRequestStatus.Created,
        ServiceRequestLifecycleAction.Assign,
      ),
    ).toBe(true);
    expect(
      ServiceRequestStateMachine.canApply(
        ServiceRequestStatus.NeedsTriage,
        ServiceRequestLifecycleAction.Assign,
      ),
    ).toBe(false);
    expect(ServiceRequestStateMachine.isTerminal(ServiceRequestStatus.Completed)).toBe(true);
    expect(ServiceRequestStateMachine.isTerminal(ServiceRequestStatus.Cancelled)).toBe(true);
    expect(ServiceRequestStateMachine.isTerminal(ServiceRequestStatus.Assigned)).toBe(false);
  });
});
