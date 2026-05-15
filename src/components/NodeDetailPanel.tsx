/**
 * Thin re-export shim — preserves the historical `./NodeDetailPanel` import
 * path while the implementation lives in `./NodeDetailPanel/index.tsx`
 * (split into a folder during Phase D of flow-v1). New code should import
 * directly from `./NodeDetailPanel/...`; this file exists for callers that
 * already reference the legacy path.
 */
export { NodeDetailPanel, vlanColor } from './NodeDetailPanel/index';
export type { NodeDetailPanelProps } from './NodeDetailPanel/index';
