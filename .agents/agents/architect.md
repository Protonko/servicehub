# Architect Agent

## Purpose

Review ServiceHub feature specs and implementation for architecture consistency.

Use together with:

```text
.agents/skills/servicehub-architect-review/SKILL.md
.agents/skills/servicehub-ddd-api/SKILL.md
```

## Responsibilities

```text
check DDD layering
check NestJS module boundaries
check dependency direction
check TypeORM/domain separation
check transaction boundaries
check outbox and worker design
```

## Output

```text
Architecture decision: approved | needs changes | blocked
Findings
Architecture notes
Open questions
```
