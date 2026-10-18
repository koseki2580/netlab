# TC Traceability Check

`npm run tc:check` compares the `TC-*` tables in
[`docs/user-guide/specifications/specification.md`](../user-guide/specifications/specification.md)
with the tests that cite them. The script is
[`scripts/tc-check.mjs`](../../scripts/tc-check.mjs); its parser is tested by
[`scripts/tc-check.test.mjs`](../../scripts/tc-check.test.mjs).

```sh
npm run tc:check              # print the report, exit 0
npm run tc:check -- --strict  # exit 1 if any error category is non-empty
```

The default run always exits 0, because the spec has known problems that are
due to be fixed separately. Use `--strict` once they are.

## What it reads

- **Spec tables**: every Markdown table whose first header cell is `Test case`
  and which has a `Level` column (the main test-case table and the regression
  table). Other tables, such as the requirement traceability matrix, are
  ignored. Cells are split on unescaped `|`.
- **Test references**: every `TC-<number>` in any file under `e2e/`, and in
  `*.test.*` / `*.spec.*` files under `src/` and `demo/`.

## What it reports

| Category                                       | Kind    | Meaning                                                                                                   |
| ---------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| (a) duplicate TC ids                           | error   | The same id is a row in more than one place (in either table).                                            |
| (b) referenced by tests but missing            | error   | A test cites an id that no spec row defines.                                                              |
| (c) Level outside the vocabulary               | error   | A Level cell has a token other than `unit`, `unit/behavior`, `unit/performance`, `integration`, `e2e`.    |
| (d) wrong cell count                           | error   | A row has more or fewer cells than its table header. Its Level is not checked, since the columns shifted. |
| (e) E2E-level ids no test references (warning) | warning | A row's Level includes `e2e` but no scanned file cites the id. Never fails `--strict`.                    |

Level is compared after normalisation: case is ignored and `+`-joined tokens
are put in a fixed order, so `Unit + E2E`, `unit + E2E` and `E2E + Unit` are
the same value.
