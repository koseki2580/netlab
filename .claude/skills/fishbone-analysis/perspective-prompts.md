# Perspective Prompts (Category Isolation)

When generating hypotheses for a category, apply that category's perspective prompt. The prompt's job is to **forbid** hypotheses that belong to other categories so the perspective stays isolated. The `NOT:` lines do most of the work.

## How to apply

1. Output `### Perspective: <Category>` as a section header.
2. Internally read the perspective prompt for that category.
3. Forget hypotheses from previous categories. They do not exist for the purposes of this category.
4. Emit 3–7 hypotheses that obey the `ONLY:` lines.
5. Move on. Do not edit prior categories.

---

## Software domain

### Code

**ONLY:**
- Implementation bugs in the code path being executed
- Design flaws in classes / modules / contracts
- Type or interface violations
- Concurrency, locking, ordering issues

**NOT:**
- Database performance (→ Data)
- Operator mistakes (→ Human)
- Upstream API behavior (→ External)
- Hardware or runtime issues (→ Infra)

### Data

**ONLY:**
- Schema design / migration state
- Index health, statistics freshness
- Payload size, encoding, serialization
- Data skew, hot keys, fragmentation

**NOT:**
- The application code that queries the data (→ Code)
- The database process or host (→ Infra)

### Infra

**ONLY:**
- CPU, memory, disk, network at the host or container level
- GC, scheduler, runtime pauses
- OS limits (file descriptors, sockets, ulimits)
- Co-tenant interference

**NOT:**
- Application code paths (→ Code)
- The deployment workflow itself (→ Process)
- External services (→ External)

### Process

**ONLY:**
- Scheduled batch jobs, cron, queues
- Deploy pipeline, warm-up, rolling updates
- Background maintenance tasks
- Sequencing across components

**NOT:**
- Code inside any single component (→ Code)
- Human operator actions (→ Human)

### Human

**ONLY:**
- A specific operator action or omission
- Config changes made by people
- Missing or unclear runbooks
- Training or knowledge gap

**NOT:**
- Anything that could happen without human involvement
- Automated process failures (→ Process)

### External

**ONLY:**
- Upstream APIs, third-party services
- DNS, CDN, network beyond the org boundary
- Provider-side incidents

**NOT:**
- Anything inside the org's own infrastructure (→ Infra)
- Code calling external services (→ Code)

---

## Manufacturing domain

### Man

**ONLY:** Operator skill level, fatigue, shift handover, training gaps, attention.
**NOT:** Equipment behavior (→ Machine), material defects (→ Material), procedure design (→ Method).

### Machine

**ONLY:** Equipment age, calibration drift, maintenance schedule, wear, breakdowns.
**NOT:** Operator misuse (→ Man), incorrect setup procedure (→ Method).

### Material

**ONLY:** Raw material lot quality, supplier variation, contamination, expiry, handling.
**NOT:** How the material is processed (→ Method or Machine).

### Method

**ONLY:** Standard work procedure, sequencing, parameter settings, recipe, work instructions.
**NOT:** Whether the operator followed the procedure (→ Man), whether the machine executed correctly (→ Machine).

### Environment

**ONLY:** Temperature, humidity, vibration, light, dust, ambient conditions, time of day, seasonality.
**NOT:** Anything controlled directly by people or machines.

---

## Ops domain

### Change

**ONLY:** Recent deploys, config pushes, schema migrations, library upgrades within the team's control.
**NOT:** External provider changes (→ Dependency), traffic shifts (→ Load).

### Load

**ONLY:** Traffic spikes, batch contention, capacity headroom, queue depth.
**NOT:** Code efficiency under load (→ Change if recent; otherwise out of scope here).

### Dependency

**ONLY:** Upstream / downstream service health, third-party API behavior, shared infra.
**NOT:** Changes pushed by our own team (→ Change).

### Config

**ONLY:** Feature flags, environment variables, secrets, runtime config that was not changed during the incident window.
**NOT:** Code changes (→ Change), runtime resource limits (→ Load).

### Permission

**ONLY:** IAM, network ACL, certificate expiry, token rotation, quota / rate-limit grants.
**NOT:** Application-level authorization bugs (→ Change).

### Human

**ONLY:** Manual intervention during the incident, runbook deviation, accidental commands.
**NOT:** Routine operator behavior (→ Process in software domain).

---

## Human-process domain

### People

**ONLY:** Skill, capacity, role clarity, attrition, motivation, ownership.
**NOT:** The communication channels themselves (→ Communication).

### Communication

**ONLY:** Channel choice, frequency, sync vs async, written vs verbal, language barriers, missing updates.
**NOT:** Whether the people had the skill (→ People), whether the process had a step for it (→ Process).

### Tool

**ONLY:** The tools used, their gaps, the workarounds, missing automation.
**NOT:** Process steps (→ Process), people's skill with the tools (→ People).

### Process

**ONLY:** Steps, sequencing, approval gates, definitions of done, handoffs, escalation paths.
**NOT:** Whether people followed the process (→ People), whether the tools supported it (→ Tool).

### Environment

**ONLY:** Org structure, incentives, reporting lines, physical / remote setup, working hours, cultural norms.
**NOT:** Anything specific to a single person, tool, or process step.

---

## When a hypothesis straddles two categories

Mark it with `cross_category: ["catA", "catB"]` and place it in the FIRST applicable category by order in the preset. **Do not duplicate it across categories.** The consolidation pass (§3 in SKILL.md) will surface it in both views.
