# Category Presets

The categories you spread hypotheses across are FIXED per `domain_hint`. Do not invent categories on the fly. If the preset does not fit, ask the user to override it explicitly.

## software

Use for application bugs, performance issues, build/deploy regressions, integration errors.

| Category | Scope (what belongs here) |
|---|---|
| Code | Implementation bugs, design flaws, type/contract violations, concurrency |
| Data | Schema, indexes, statistics, payload shape, encoding |
| Infra | Hardware, container, network, GC, scheduler, OS limits |
| Process | Pipelines, batch jobs, deploys, schedule, warm-up |
| Human | Operator action, config change, manual override, training gap |
| External | Upstream APIs, third-party services, DNS, CDN |

## manufacturing (classic 4M+E)

Use for physical production-line failures, quality defects in goods.

| Category | Scope |
|---|---|
| Man | Operator skill, fatigue, training |
| Machine | Equipment age, calibration, maintenance |
| Material | Raw material lot, supplier variation, contamination |
| Method | Procedure, standard work, sequencing |
| Environment | Temperature, humidity, vibration, light |

## ops

Use for production incidents, on-call escalations, infrastructure failures.

| Category | Scope |
|---|---|
| Change | Recent deploy, config push, schema migration |
| Load | Traffic spike, batch contention, capacity headroom |
| Dependency | Upstream/downstream service health |
| Config | Feature flags, environment variables, secrets |
| Permission | IAM, network ACL, certificate expiry |
| Human | Manual intervention, runbook deviation |

## human-process

Use for team/process breakdowns, communication failures, missed deadlines.

| Category | Scope |
|---|---|
| People | Skill, capacity, role clarity, attrition |
| Communication | Channel, frequency, written vs verbal, language |
| Tool | The tools used, their gaps, the workarounds |
| Process | Steps, sequencing, approval gates, definitions of done |
| Environment | Org structure, incentives, physical/remote setup |

## Choosing the preset when domain_hint = auto

Read the problem statement and pick ONE:

- Mentions code, logs, errors, services, build, deploy → `software`
- Mentions production line, defect rate, machine, batch yield → `manufacturing`
- Mentions outage, incident, oncall, alert, SLO → `ops`
- Mentions team, missed deadline, miscommunication, handoff → `human-process`

If two presets look applicable, ask the user to pick one explicitly. **Do not mix categories from two presets** — that defeats the perspective isolation, which is the whole point of this skill.
