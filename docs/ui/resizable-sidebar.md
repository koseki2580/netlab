# Resizable Sidebar

## Overview

The `ResizableSidebar` component replaces fixed-width right-side panels across all demo layouts. It allows users to drag its left edge to freely resize the panel while the canvas area automatically adjusts to fill remaining space.

---

## Component API

### `ResizableSidebar`

Located at `src/components/ResizableSidebar.tsx`.

```tsx
interface ResizableSidebarProps {
  defaultWidth: number;
  minWidth?: number;       // default: 150
  maxWidth?: number;       // default: 600
  style?: React.CSSProperties;  // applied to outer container (background, border, etc.)
  children: React.ReactNode;
}
```

**Usage:**
```tsx
<ResizableSidebar
  defaultWidth={300}
  minWidth={150}
  maxWidth={600}
  style={{ background: '#0f172a', borderLeft: '1px solid #1e293b' }}
>
  <MyPanelContent />
</ResizableSidebar>
```

---

## Internal Structure

The component renders as a flex row:

```
┌─────────────────────────────────────────────────────┐
│ drag-handle (4px) │       content (flex: 1)          │
└─────────────────────────────────────────────────────┘
```

- **drag-handle**: A 4px-wide vertical strip on the left edge with `cursor: col-resize`. Highlights on hover to provide a visual affordance.
- **content**: The children wrapped in an overflow container.

The outer container has an explicit `width` driven by state and `flexShrink: 0` to prevent the layout from compressing it.

---

## Resize Interaction

1. User hovers over the drag handle → cursor changes to `col-resize`, handle highlights.
2. User presses mouse button → drag starts, recording `startX` and `startWidth`.
3. While dragging → width updates as `clamp(startWidth - (clientX - startX), minWidth, maxWidth)`.
   - Dragging **left** increases width.
   - Dragging **right** decreases width.
4. User releases mouse button → drag ends, `userSelect` is restored.

`document.body.style.userSelect = 'none'` is applied during drag to prevent accidental text selection. It is restored to `''` on mouse-up.

---

## Width Constraints

| Constraint | Default |
|---|---|
| `minWidth` | 150px |
| `maxWidth` | 600px |

These can be overridden per instance via props.

---

## State Management

Width state is managed internally with `useState` inside `ResizableSidebar`. Each panel instance independently tracks its own width. There is no shared or persisted state — width resets to `defaultWidth` on page reload.

---

## Affected Layouts

| Demo | File | Default Width |
|---|---|---|
| Client–Server Routing | `demo/routing/ClientServerDemo.tsx` | 260px |
| Step-by-Step Simulation | `demo/simulation/StepSimDemo.tsx` | 380px |
| Failure Simulation | `demo/simulation/FailureSimDemo.tsx` | 300px |
| Topology Editor | `demo/editor/EditorDemo.tsx` | 300px |

The floating `NodeEditorPanel` (`src/editor/components/NodeEditorPanel.tsx`) uses `position: absolute` and is not affected.

---

## Layout Integration

All affected layouts use a flex row at the top level:

```
┌───────────────────────────────┬──────────────────────┐
│     canvas (flex: 1)          │  ResizableSidebar     │
└───────────────────────────────┴──────────────────────┘
```

The canvas area has `flex: 1` and automatically fills the space not occupied by the sidebar. No layout changes are needed in the canvas area.
