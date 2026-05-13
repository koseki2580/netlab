# API Deprecation Lifecycle

Netlab treats `src/index.ts` and documented package exports as the public API surface. Public removals must be visible before they happen.

## Lifecycle

| Phase      | Meaning                                            | Requirements                                                                                                                                                             |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stable     | Public API is supported.                           | No warning is emitted.                                                                                                                                                   |
| Deprecated | API remains public but has a planned replacement.  | JSDoc includes `@deprecated`, `@removeAt v<minor>`, and `@migrate <symbol-or-path>`. Runtime warnings may be added once per process when the deprecated path is invoked. |
| Internal   | API is no longer exported from the public surface. | Removal is allowed only after the documented `@removeAt` minor has elapsed and the changelog records the migration.                                                      |
| Deleted    | Implementation is removed.                         | Tests and docs no longer reference the deleted API.                                                                                                                      |

## Lint Contract

Every `@deprecated` JSDoc block in `src/` must include both:

```ts
/**
 * @deprecated Use createNewEngine instead.
 * @removeAt v0.2.0
 * @migrate createNewEngine
 */
```

The `@removeAt` tag records the earliest minor release where removal is allowed. The `@migrate` tag gives the concrete replacement so downstream users are not left with a warning that cannot be acted on.

`plan/81c` will lock the public API snapshot. This lifecycle document defines how later plans can intentionally deprecate and eventually remove public symbols without silent consumer breakage.
