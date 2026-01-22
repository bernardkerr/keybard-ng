# Proposal: Embedded Cosmetic Names (Simplified)

**Date:** 2026-01-19
**Author:** Morgan (via Claude Code)
**Status:** Draft Proposal for Discussion
**Supersedes:** `cosmetic-names-proposal.md` (alternative approach)

## Summary

Embed a 26-byte name field directly into each nameable object's data structure. No separate storage, no new commands — names are simply part of the object.

## Motivation

The original cosmetic names proposal introduced a separate sparse storage system with dedicated get/set commands. While flexible, it adds complexity:

- New command IDs (0x20, 0x21, 0x22)
- Sparse pool management with compaction
- Separate file format section for names
- GUI must correlate names with objects

**Simpler approach:** Just make the name part of the object itself.

## Design

### Principle

Each nameable object gains a `name[26]` field. The name:
- Is read/written with the object (no separate commands)
- Travels with the object in `.viable` files
- Uses empty string (first byte = 0) for "unnamed"

### Modified Structures

**Tap Dance (was 10 bytes → 36 bytes):**
```c
typedef struct __attribute__((packed)) {
    uint16_t on_tap;
    uint16_t on_hold;
    uint16_t on_double_tap;
    uint16_t on_tap_hold;
    uint16_t custom_tapping_term;
    char     name[26];              // NEW: 25 chars + null
} viable_tap_dance_entry_t;
```

**Combo (was 12 bytes → 38 bytes):**
```c
typedef struct __attribute__((packed)) {
    uint16_t input[4];
    uint16_t output;
    uint16_t custom_combo_term;
    char     name[26];              // NEW
} viable_combo_entry_t;
```

**Key Override (was 12 bytes → 38 bytes):**
```c
typedef struct __attribute__((packed)) {
    uint16_t trigger;
    uint16_t replacement;
    uint32_t layers;
    uint8_t  trigger_mods;
    uint8_t  negative_mod_mask;
    uint8_t  suppressed_mods;
    uint8_t  options;
    char     name[26];              // NEW
} viable_key_override_entry_t;
```

**Alt Repeat Key (was 6 bytes → 32 bytes):**
```c
typedef struct __attribute__((packed)) {
    uint16_t keycode;
    uint16_t alt_keycode;
    uint8_t  allowed_mods;
    uint8_t  options;
    char     name[26];              // NEW
} viable_alt_repeat_key_entry_t;
```

**Leader (was 14 bytes → 40 bytes):**
```c
typedef struct __attribute__((packed)) {
    uint16_t sequence[5];
    uint16_t output;
    uint16_t options;
    char     name[26];              // NEW
} viable_leader_entry_t;
```

**Layer Metadata (NEW structure):**
```c
typedef struct __attribute__((packed)) {
    char     name[26];              // Layer name
    uint8_t  hue;                   // Layer color (already exists in sval)
    uint8_t  sat;
    uint8_t  flags;                 // Reserved
    uint8_t  reserved[3];
} viable_layer_meta_t;

#define VIABLE_LAYER_META_ENTRIES  16
```

### Storage Impact

| Object | Old Size | New Size | Count | Old Total | New Total |
|--------|----------|----------|-------|-----------|-----------|
| Tap Dance | 10 | 36 | 32 | 320 | 1,152 |
| Combo | 12 | 38 | 32 | 384 | 1,216 |
| Key Override | 12 | 38 | 16 | 192 | 608 |
| Alt Repeat | 6 | 32 | 32 | 192 | 1,024 |
| Leader | 14 | 40 | 16 | 224 | 640 |
| Layer Meta | 0 | 32 | 16 | 0 | 512 |
| **Total** | | | | **1,312** | **5,152** |

**Additional storage:** ~3.8 KB

With 16MB flash, this is negligible (0.02% of available space).

## Protocol Changes

### No New Commands

Names are embedded in existing get/set commands. The only change is the structure size.

**Example: Tap Dance Get (0x01)**
```
Request:  [0xDF][0x01][index]
Response: [0xDF][0x01][index][on_tap:2][on_hold:2][on_double:2][on_tap_hold:2][term:2][name:26]
```

**Example: Tap Dance Set (0x02)**
```
Request:  [0xDF][0x02][index][on_tap:2][on_hold:2][on_double:2][on_tap_hold:2][term:2][name:26]
Response: [0xDF][0x02][status]
```

### New Command: Layer Meta

Layers don't have an existing structure, so we add one:

| Command | ID | Description |
|---------|-----|-------------|
| `layer_meta_get` | `0x1E` | Get layer metadata (name, color, flags) |
| `layer_meta_set` | `0x1F` | Set layer metadata |

**Layer Meta Get:**
```
Request:  [0xDF][0x1E][layer_index]
Response: [0xDF][0x1E][layer_index][name:26][hue][sat][flags][reserved:3]
```

**Layer Meta Set:**
```
Request:  [0xDF][0x1F][layer_index][name:26][hue][sat][flags][reserved:3]
Response: [0xDF][0x1F][status]
```

## File Format

Names are part of each object — no separate `names` section needed.

**Current format (tap dance example):**
```json
{
  "tapdances": [
    { "on_tap": 4, "on_hold": 224, "on_double_tap": 0, "on_tap_hold": 0, "term": 32768 }
  ]
}
```

**New format:**
```json
{
  "tapdances": [
    {
      "on_tap": 4,
      "on_hold": 224,
      "on_double_tap": 0,
      "on_tap_hold": 0,
      "term": 32768,
      "name": "Shift Dance"
    }
  ]
}
```

**Layer metadata:**
```json
{
  "layers": [
    { "name": "Base", "hue": 0, "sat": 0 },
    { "name": "Gaming", "hue": 85, "sat": 255 },
    { "name": "NAS", "hue": 170, "sat": 255 }
  ]
}
```

## GUI Changes

### Minimal

Services already fetch/push full objects. Just extend the types:

```typescript
interface TapDanceEntry {
  on_tap: number;
  on_hold: number;
  on_double_tap: number;
  on_tap_hold: number;
  custom_tapping_term: number;
  name: string;  // NEW
}

interface LayerMeta {
  name: string;
  hue: number;
  sat: number;
}
```

### Display

```tsx
// In TapdancePanel.tsx
<span className="td-name">
  {td.name || `Tap Dance ${index}`}
</span>

// In LayerSelector.tsx
<button>
  {layerMeta[i]?.name || `Layer ${i}`}
</button>
```

### Editing

Inline edit or modal — name is just another field:

```tsx
<input
  value={td.name}
  onChange={(e) => updateTapDance(index, { ...td, name: e.target.value.slice(0, 25) })}
  placeholder={`Tap Dance ${index}`}
/>
```

## Firmware Changes

### Structure Updates

Update `viable.h` with new structures (as shown above).

### EEPROM Layout

Recalculate offsets — structures are larger:

```c
#define VIABLE_TAP_DANCE_SIZE        (VIABLE_TAP_DANCE_ENTRIES * sizeof(viable_tap_dance_entry_t))
// etc.
```

### Protocol Handlers

Existing get/set handlers already copy the full structure. With larger structures, ensure:
- Buffer sizes accommodate new sizes
- Multi-packet transfers if needed (32-byte HID limit)

**Note:** 36-40 byte structures exceed single 32-byte HID packet. Options:
1. Use chunked transfer (2 packets)
2. Extend HID report size
3. Accept that names are truncated in protocol (full name in file only)

**Recommended:** Chunked transfer (simple, no descriptor changes)

```c
case viable_cmd_tap_dance_get: {
    uint8_t idx = data[2];
    viable_tap_dance_entry_t entry;
    viable_get_tap_dance(idx, &entry);

    // First packet: core data + first 22 bytes of name
    memcpy(&data[3], &entry, 29);  // 10 bytes data + 22 name prefix - fits in 32
    // Client requests second packet for remaining 4 bytes if needed
    break;
}
```

Or simpler: **truncate name to 20 chars in protocol, full 25 in file**. Protocol is for live editing; files preserve full names.

## Comparison with Original Proposal

| Aspect | Original (Sparse Pool) | Embedded |
|--------|----------------------|----------|
| New commands | 3 (get/set/info) | 2 (layer meta only) |
| Storage overhead | Variable (~100-500 bytes typical) | Fixed (~5KB) |
| Complexity | Moderate (sparse pool mgmt) | Low (just bigger structs) |
| Names without objects | Possible | No (name requires object) |
| Protocol changes | New namespace | Extend existing structs |
| File format | Separate `names` section | Inline with objects |

## Migration

### Firmware

1. Update structure definitions
2. Update EEPROM layout constants
3. Add layer_meta get/set handlers
4. Test with increased structure sizes

### GUI

1. Extend TypeScript types with `name` field
2. Update services to handle larger responses
3. Add name display/edit UI to panels
4. Update file import/export

### File Format

- Old files without names: `name` defaults to empty string
- New files: include `name` field in each object

## Advantages

1. **Simpler firmware** — No separate storage system
2. **Simpler protocol** — Only 2 new commands (layer meta), not 3
3. **Simpler files** — Names inline with objects
4. **Atomic updates** — Name changes with object in single operation
5. **No fragmentation** — Fixed storage, no compaction needed

## Disadvantages

1. **Fixed overhead** — 26 bytes per object even if unnamed
2. **HID packet size** — May need chunking for larger structures
3. **No standalone names** — Can't name a "slot" without creating the object

## Open Questions

1. **Protocol chunking**: Accept 20-char limit in protocol, or implement multi-packet?
2. **Layer meta storage**: Dedicated EEPROM region, or part of existing keymap structure?
3. **Backward compatibility**: How to handle firmware upgrade with structure size change?

## References

- Current structures: `viable-qmk/modules/viable-kb/core/viable.h`
- Original proposal: `docs/proposals/cosmetic-names-proposal.md`
- Layer colors (already exists): `viable-qmk/modules/viable-kb/core/sval.c`
