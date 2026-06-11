# Golden Stakeholder Review

Use this output shape when reviewing business behavior.

```markdown
Stakeholder decision: accepted with changes

Business fit:
- The feature supports dispatcher-controlled assignment and keeps technician suggestions advisory, which matches ServiceHub's operating model.

Findings:
- [major] Eligible technician search does not explain why a technician was excluded. Dispatchers need enough feedback to resolve scheduling issues.
  Expected behavior: return candidates plus exclusion reasons in internal diagnostics or logs, at minimum for tests/admin debugging.

- [blocking] The assignment flow allows requests with `Other` service type. Business rule says these requests must be triaged before assignment.

Missing acceptance criteria:
- Dispatcher sees only active assignable requests by default.
- Customer receives clear cancellation error after technician is on the way.

Open questions:
- Should dispatcher be allowed to override technician daily assignment limit?
```

## Stakeholder Review Focus

Check:

```text
does this match how a service company works
does it protect customers from seeing other customers' data
does it help dispatchers make correct decisions
does it protect technicians from invalid assignments
does it preserve auditability
does it avoid surprising status transitions
```

Avoid:

```text
code style comments
framework preferences
database micro-optimizations unless business behavior is at risk
```
