# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeyBard-NG is a React 19 + TypeScript web application for configuring Viable-compatible keyboards (especially Svalboard) via WebHID API. It enables real-time keymap editing, macro programming, and QMK settings management.

**Note:** This project is migrating from the Vial protocol to the Viable protocol. The Viable protocol uses a client ID wrapper (`0xDD`) for multi-client concurrent access and adds features like alt-repeat keys, leader sequences, and one-shot settings.

## Development Commands

```bash
npm run dev            # Start dev server at http://localhost:5173
npm run build          # Production build (TypeScript check + Vite build)
npm test               # Run all tests
npm run test:watch     # Watch mode for development
npm run test:coverage  # Tests with coverage report (75-90% thresholds)
npm run test:ui        # Interactive Vitest UI
```

## Architecture

### Layer Structure
```
UI Components → React Contexts → Services → VialUSB → WebHID API → Physical Keyboard
```

### Key Architectural Patterns

**Context-Based State Management:** Seven specialized contexts handle different domains:
- `VialContext` - Keyboard state and operations
- `KeyBindingContext` - Key selection and editing
- `ChangesContext` - Change tracking
- `LayerContext` - Layer management
- `PanelsContext` - UI panel visibility
- `SettingsContext` - Application settings
- `LayoutSettingsContext` - Keyboard layout preferences

**Service Layer:** Each feature has a dedicated service class that encapsulates protocol details:
- `VialService` - Core Vial protocol (keyboard loading, keymap read/write)
- `VialUSB` - WebHID API abstraction with 32-byte message protocol
- `KeyService` - Keycode parsing and stringification
- `QMKService` - QMK settings management
- `SvalService` - Svalboard-specific features
- `MacroService`, `TapdanceService`, `ComboService`, `OverrideService` - Feature-specific services

**USB Communication:** VialUSB class handles queue-based async operations with command/response protocol.

### Import Aliases
```typescript
@/           → src/
@services/   → src/services/
@contexts/   → src/contexts/
@components/ → src/components/
@types/      → src/types/
@constants/  → src/constants/
```

### Key Constants
- `KEYMAP` - Maps keycode names to numeric codes
- `CODEMAP` - Reverse mapping (code to name)
- `KEYALIASES` - Alternative keycode names

## Testing

Tests use Vitest with jsdom environment. WebHID API is mocked in `tests/setup.ts`.

**Test Structure:**
- `tests/services/` - Service layer tests
- `tests/components/` - Component tests
- `tests/contexts/` - Context tests
- `tests/fixtures/` - Test keyboard definitions and keymaps
- `tests/mocks/` - Mock implementations (especially USB)

**Coverage Thresholds:** 90% branches, 75% functions/lines/statements

## Key Components

- `KeyboardConnector` - Main orchestration component
- `Keyboard` - Keyboard layout renderer
- `Key` - Individual key component with binding support
- `MatrixTester` - USB polling and key press detection
- `QMKSettings` - QMK settings UI panel
- `MainScreen` - Root application UI

## Documentation

Comprehensive docs in `/docs/`:
- `ARCHITECTURE.md` - System design and data flow
- `API.md` - Service API reference
- `COMPONENTS.md` - Component hierarchy and patterns
- `TYPES.md` - TypeScript type reference

## Viable Protocol Migration

### Protocol Differences from Vial

| Aspect | Vial | Viable |
|--------|------|--------|
| **Wrapper** | None | `0xDD` client ID wrapper |
| **Protocol Prefix** | `0xFE` | `0xDF` (Viable) / `0xFE` (VIA, wrapped) |
| **Client Auth** | None | 20-byte nonce bootstrap, TTL-based renewal |
| **Detection** | HID filter | `viable:` prefix in USB serial |

### Message Format

```
Bootstrap:  [0xDD][0x00000000][nonce:20] → [0xDD][0x00000000][nonce:20][client_id:4][ttl:2]
Viable cmd: [0xDD][client_id:4][0xDF][cmd][args...] → [0xDD][client_id:4][0xDF][response...]
VIA cmd:    [0xDD][client_id:4][0xFE][via_cmd...] → [0xDD][client_id:4][0xFE][response...]
```

### Viable Command IDs (0xDF protocol)

- `0x00` - get_info (protocol version, UID, feature flags)
- `0x01/0x02` - tap_dance get/set
- `0x03/0x04` - combo get/set
- `0x05/0x06` - key_override get/set
- `0x07/0x08` - alt_repeat_key get/set (NEW)
- `0x09/0x0A` - one_shot get/set (NEW)
- `0x0B` - save, `0x0C` - reset
- `0x0D/0x0E` - definition size/chunk
- `0x10-0x13` - QMK settings query/get/set/reset
- `0x14/0x15` - leader get/set (NEW)

## VIA3 Custom UI System

The keyboard definition JSON includes a `menus` array that defines dynamic, keyboard-specific settings UI. This enables keyboards like Svalboard to expose custom settings (DPI, scroll mode, layer colors) without hardcoding them in the GUI.

### Menu Structure

```json
{
  "menus": [
    {
      "label": "Pointing Device",
      "content": [
        {
          "label": "Left Pointer",
          "content": [
            {
              "label": "DPI",
              "type": "dropdown",
              "options": ["200", "400", "800", "1600"],
              "content": ["id_left_dpi", 0, 0]
            },
            {
              "label": "Scroll Mode",
              "type": "toggle",
              "content": ["id_left_scroll", 0, 1]
            }
          ]
        }
      ]
    }
  ]
}
```

### Control Types

| Type | Description | Options Format |
|------|-------------|----------------|
| `dropdown` | Select from list | `["opt1", "opt2", ...]` |
| `toggle` | Boolean switch | None |
| `range` | Slider/number input | `[min, max]` |
| `color` | HSV color picker | None |

### Content Array Format

`["value_id", channel, value_index]`

- `value_id` - Human-readable identifier for the setting
- `channel` - VIA channel ID (usually 0 for keyboard-specific)
- `value_index` - Index within the channel's value space

### Conditional Visibility

```json
{
  "showIf": "{id_automouse_enable} == 1",
  "content": [ /* shown only when automouse is enabled */ ]
}
```

### Implementation Plan for Svalboard Settings Panel

1. **Parse menus from keyboard definition** during `loadKeyboard()`
2. **Create dynamic UI renderer** that maps menu structure to React components
3. **Implement value get/set** via `CMD_VIA_GET_KEYBOARD_VALUE` / `CMD_VIA_SET_KEYBOARD_VALUE` with custom channel routing
4. **Add showIf evaluator** for conditional UI visibility
5. **Persist changes** via `id_custom_save` command
