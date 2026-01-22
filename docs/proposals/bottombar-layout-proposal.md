# Bottom Bar Layout Mode Proposal

## Overview

This proposal outlines a new "Bottom Bar" layout mode where key selector panels appear horizontally across the bottom of the screen instead of in the right-side detail panel. This enables productive use of the application at quarter-screen sizes where vertical space is limited.

## Current Layout

```
┌─────────────────────────────────────────────────────┐
│              LayerSelector (Top)                    │
├────────┬────────────────────────────┬───────────────┤
│Primary │                            │   Detail      │
│Sidebar │    Keyboard View           │   Sidebar     │
│ (nav)  │    (centered)              │   (panels)    │
│        │                            │   ~512px      │
│        │                            │               │
├────────┴────────────────────────────┴───────────────┤
│  Bottom Controls (size toggle, live update)         │
└─────────────────────────────────────────────────────┘
```

**Problems at small screen sizes:**
- Detail sidebar (512px) consumes significant horizontal space
- Keyboard view gets compressed horizontally
- Vertical space is wasted when keyboard is small

## Proposed Bottom Bar Layout

```
┌─────────────────────────────────────────────────────┐
│              LayerSelector (Top)                    │
├────────┬────────────────────────────────────────────┤
│Primary │                                            │
│Sidebar │         Keyboard View                      │
│ (nav)  │         (more vertical space)              │
│        │                                            │
├────────┼────────────────────────────────────────────┤
│        │  Bottom Panel (key selectors, ~200-250px)  │
│        │  ┌─────┬─────┬─────┬─────┬─────┬─────┐    │
│        │  │ Tab │ Tab │ Tab │ Tab │ ... │     │    │
│        │  ├─────┴─────┴─────┴─────┴─────┴─────┤    │
│        │  │ Panel Content (horizontal scroll) │    │
│        │  └───────────────────────────────────┘    │
└────────┴────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Panel Selection (No Duplicate Tabs)

The **primary sidebar remains the panel selector** - no duplicate tab bar needed in the bottom panel. Clicking a panel in the sidebar opens its content in the bottom area instead of the right sidebar.

This keeps the UI clean and consistent with the existing navigation pattern.

### 2. Panel Content Area

**Height:** Fixed at ~200-250px (configurable?)
**Width:** Full width minus primary sidebar
**Scrolling:** Horizontal scroll for key grids that exceed width

**Content adaptation:**
- Key grids flow horizontally (flex-wrap or horizontal scroll)
- QwertyKeyboard already compact, fits well
- Numpad/special keys wrap or scroll
- List-style panels (Macros, TapDance, Combos) become horizontal card layout

### 3. Primary Sidebar Behavior

**No change needed** - Primary sidebar remains on the left, functions identically.

The sidebar's role shifts slightly:
- Current: Click panel → opens in right sidebar
- Bottom bar mode: Click panel → opens in bottom panel

### 4. Layout Mode Toggle

**Location:** Bottom control bar (next to size selector)
**UI:** Toggle or segmented control

```
[NORMAL] [MEDIUM] [SMALL]     [SIDEBAR | BOTTOM]
```

Or a single icon toggle:
```
[NORMAL] [MEDIUM] [SMALL]     [⬓] ← layout mode icon
```

### 5. State Management

New state in `LayoutSettingsContext`:
```typescript
type LayoutMode = 'sidebar' | 'bottombar';

interface LayoutSettings {
  keyVariant: 'default' | 'medium' | 'small';
  layoutMode: LayoutMode;  // NEW
  // ...
}
```

### 6. Keyboard View Adjustments

In bottom bar mode:
- Remove right padding (`pr-[450px]`)
- Add bottom padding/margin for panel height
- Center keyboard in remaining vertical space
- Consider auto-sizing keyboard to fit available space

## Implementation Plan

### Phase 1: Layout Infrastructure

1. **Add `layoutMode` to LayoutSettingsContext**
   - Default to `'sidebar'` (current behavior)
   - Persist in localStorage like other settings

2. **Create `BottomPanel.tsx` component**
   - Similar structure to SecondarySidebar but horizontal
   - Tab bar at top
   - Content area below
   - Fixed height, full width

3. **Modify `EditorLayout.tsx`**
   - Conditionally render SecondarySidebar OR BottomPanel based on layoutMode
   - Adjust content area flex direction and sizing

### Phase 2: Panel Adaptation

4. **Create horizontal variants of key selector panels**
   - `BasicKeyboards` - already mostly horizontal, may need width constraints
   - `QmkKeysPanel` - wrap keys differently
   - `SpecialKeysPanel` - horizontal tabs or accordion
   - `MousePanel` - horizontal key list
   - `LayersPanel` - horizontal card layout

5. **Handle list-style panels**
   - `TapdancePanel`, `CombosPanel`, `MacrosPanel`, `OverridesPanel`
   - These show lists of items - need horizontal card/chip layout
   - OR: These open in a modal/overlay when in bottom bar mode

### Phase 3: Polish

6. **Add layout mode toggle UI**
   - Button in bottom control bar
   - Smooth transition animation between modes

7. **Responsive refinements**
   - Auto-switch to bottom bar at certain breakpoints?
   - Panel height adjustment based on available space

## Deferred: Modal Editors

The TapDance, Combo, Macro, and Override *editors* (when editing a specific item) currently use an overlay that slides in. In bottom bar mode, these could:

**Option A:** Continue using overlay (covers bottom panel)
**Option B:** Open as a centered modal dialog
**Option C:** Expand the bottom panel temporarily

Recommendation: **Option A** for initial implementation - the overlay system already works and is effectively modal.

## File Changes Summary

| File | Change |
|------|--------|
| `src/contexts/LayoutSettingsContext.tsx` | Add `layoutMode` state |
| `src/layout/EditorLayout.tsx` | Conditional layout rendering |
| `src/layout/BottomPanel.tsx` | NEW - Bottom panel container |
| `src/layout/BottomPanel/TabBar.tsx` | NEW - Horizontal tab navigation |
| `src/layout/BottomPanel/PanelContent.tsx` | NEW - Content wrapper |
| `src/layout/BottomBar.tsx` | Add layout mode toggle |

## Open Questions

1. **Panel height:** Fixed 200px? 250px? User-resizable?
2. **Tab overflow:** Horizontal scroll vs. dropdown menu for many tabs?
3. **Auto-switch:** Should app automatically use bottom bar at small screen sizes?
4. **Keyboard sizing:** Should keyboard auto-scale to fit, or use existing size presets?
5. **Animation:** Smooth transition between layout modes, or instant switch?

## Mockup Sketch

```
Quarter-screen with bottom bar mode:

┌────┬──────────────────────────────┐
│ ≡  │  [default] [1] [2] [NAS]... │  ← Layer tabs
│    ├──────────────────────────────┤
│ ⌨  │                              │
│ ♦  │      ┌─────┐ ┌─────┐        │
│ ◧  │      │     │ │     │        │  ← Compact keyboard
│ ◫  │      └─────┘ └─────┘        │
│ 🖱  │         (keyboard)          │
│ TD │                              │
│ M  ├──────────────────────────────┤
│ C  │ [Keyboard][Special][OSM]... │  ← Panel tabs
│ O  │ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐   │
│ ─  │ │Q ││W ││E ││R ││T ││Y │→  │  ← Horizontally scrolling keys
│ ⚙  │ └──┘└──┘└──┘└──┘└──┘└──┘   │
└────┴──────────────────────────────┘
```

## Success Criteria

1. All key selector panels functional in bottom bar mode
2. Keyboard view gains vertical space
3. Usable at 1/4 screen size (e.g., 960x540 or smaller)
4. No regressions in sidebar mode
5. Smooth toggle between modes
6. Settings persist across sessions
