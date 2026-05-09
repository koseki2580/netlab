# Sandbox Scenario Authoring

Sandbox scenario authoring turns the current sandbox state into files that can become a reusable `Scenario`.

## Export Model

The authoring flow is export-and-commit. Netlab generates TypeScript as the primary artifact because `Scenario` is a TypeScript public type. The `.netlabscenario.json` export is a portable companion file for review or future loaders, but runtime JSON registration is not part of this feature.

The exporter is a pure function over a `SimulationSnapshot`, an `EditSession`, and author-supplied metadata. It does not read the DOM, perform network requests, or register the scenario.

## Author Controls

Authors provide:

- `scenarioId`: kebab-case and unique in `scenarioRegistry`.
- `title` and `summary`: non-empty scenario metadata.
- `preseedStrategy`: `as-initial` freezes the current snapshot as the initial topology; `as-delta` keeps the provided snapshot as the initial topology and stores the visible edit session as `preseedEdits`.
- `includeAnnotations`: off by default so learner scratch notes do not leak into scenario source.
- optional rubric attachment: references an existing registered assessment rubric by id; the generated TypeScript looks up the source scenario instead of cloning the rubric.

## Generated Artifacts

The TypeScript file exports a `Scenario` object with:

- `metadata` using the author input and conservative defaults for objective, difficulty, protocols, and prerequisites.
- `topology` copied from the selected snapshot, including route tables.
- `parameters` copied from the snapshot.
- `preseedEdits` only when the author chooses `as-delta`.
- `preseedAnnotations` only when explicitly enabled.
- `assessmentRubric` only when an existing rubric id is selected.

The JSON file stores the same scenario payload in a serializable shape. Maps such as route tables are encoded as arrays so they can be inspected and round-tripped without executing TypeScript.

## Validation

Export is blocked when:

- the scenario id is not kebab-case or already registered;
- title or summary is empty;
- topology node ids or edge ids are duplicated;
- an edge points at a missing node;
- protocol parameters are outside supported positive ranges;
- annotations contain unsupported HTML-like markup;
- a requested rubric id is not found in a registered scenario.

Validation runs before each download and the dialog renders all blocking errors.

## Contributor Flow

1. Open a sandbox scenario and make the relevant edits.
2. Open **Export as scenario** from the sandbox header.
3. Fill scenario metadata and choose whether the current state is exported as the initial topology or as a preseeded edit delta.
4. Review the TypeScript preview.
5. Download the `.ts` file and add it under `src/scenarios/`.
6. Register the scenario in `src/scenarios/index.ts`.
7. Run typecheck, lint, tests, build, size, and e2e before merging.
