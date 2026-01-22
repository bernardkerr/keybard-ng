# Proposal: Multi-Client Change Notifications for Viable Protocol

**Date:** 2026-01-19
**Author:** Morgan (via Claude Code)
**Status:** Draft Proposal for Discussion
**Dependencies:** None (foundational)
**Dependents:** `cosmetic-names-proposal.md` (optional integration)

## Summary

A change notification system that allows multiple connected clients to stay synchronized when any client modifies keyboard state. This proposal presents **two approaches**:

- **Approach A: Polling-Based** — Clients periodically ask "what changed?"
- **Approach B: Event-Based (Push)** — Firmware broadcasts notifications when state changes

**Recommendation:** Approach B (event-based) with Approach A as fallback.

---

## Motivation

The Viable protocol supports multiple concurrent clients via its client ID system (`0xDD` wrapper with TTL-based sessions). However, there's currently no mechanism for clients to detect when another client has made changes.

**Current behavior:**
1. Client A connects, loads keymap
2. Client B connects, loads same keymap
3. Client A changes Layer 2, Key 5 to `KC_A`
4. Client B still shows old binding — **no way to know it changed**
5. Client B must manually refresh or reconnect

**Desired behavior:**
1. Clients receive instant notification when state changes
2. Only affected categories are refreshed (not full reload)
3. Works seamlessly with existing client ID infrastructure

## Existing Precedent: Layer State Polling

The `layer_state_get` command (0x16) already enables efficient polling for transient state. The [layer_monitor](https://github.com/ilc/layer_monitor) tool polls every 200ms to display the current layer in the system tray.

```
Request:  [0xDF][0x16]
Response: [0xDF][0x16][state:4 LE]  // 32-bit layer mask
```

This works but doesn't scale to multiple state categories.

---

## Change Categories (Shared by Both Approaches)

```
Bit 0  (0x0001) = keymap        Key bindings changed
Bit 1  (0x0002) = macros        Macro content changed
Bit 2  (0x0004) = combos        Combo definitions changed
Bit 3  (0x0008) = tapdances     Tap dance definitions changed
Bit 4  (0x0010) = overrides     Key override definitions changed
Bit 5  (0x0020) = leaders       Leader sequences changed
Bit 6  (0x0040) = alt_repeat    Alt-repeat keys changed
Bit 7  (0x0080) = names         Cosmetic names changed
Bit 8  (0x0100) = settings      QMK settings changed
Bit 9  (0x0200) = fragments     Fragment selections changed
Bit 10 (0x0400) = layer_state   Active layer changed (transient)
Bit 11 (0x0800) = oneshot       One-shot settings changed
Bit 12-15       = (reserved for future use)
```

---

## Approach A: Polling-Based

### Overview

Clients periodically request change status from the firmware. Firmware tracks pending changes per-client.

### Protocol

| Command | ID | Description |
|---------|-----|-------------|
| `get_change_flags` | `0x1B` | Get bitmap of categories changed since last ack |
| `ack_change_flags` | `0x1C` | Acknowledge processed changes, clear flags |
| `get_change_seq` | `0x1D` | Get global sequence number (lightweight check) |

### Message Format

**Get Change Flags:**
```
Request:  [0xDF][0x1B]
Response: [0xDF][0x1B][flags:2 LE][seq:4 LE]
```

**Ack Change Flags:**
```
Request:  [0xDF][0x1C][flags:2 LE]
Response: [0xDF][0x1C][status:1]
```

**Get Change Sequence:**
```
Request:  [0xDF][0x1D]
Response: [0xDF][0x1D][seq:4 LE]
```

### Firmware Data Structures

```c
#define VIABLE_MAX_CLIENTS 4

typedef struct {
    uint32_t client_id;
    uint16_t pending_changes;  // Bitmap of unacknowledged changes
} viable_client_notify_t;

static viable_client_notify_t notify_clients[VIABLE_MAX_CLIENTS];
static uint32_t change_seq = 0;
```

### Firmware Logic

```c
// Called when any state changes
void viable_notify_change(uint32_t source_client_id, uint16_t categories) {
    if (categories == 0) return;
    change_seq++;

    // Set flags for all OTHER connected clients
    for (int i = 0; i < VIABLE_MAX_CLIENTS; i++) {
        if (notify_clients[i].client_id != 0 &&
            notify_clients[i].client_id != source_client_id) {
            notify_clients[i].pending_changes |= categories;
        }
    }
}

// Protocol handler
case viable_cmd_get_change_flags: {
    uint16_t flags = viable_get_pending_changes(client_id);
    data[2] = flags & 0xFF;
    data[3] = (flags >> 8) & 0xFF;
    data[4] = change_seq & 0xFF;
    data[5] = (change_seq >> 8) & 0xFF;
    data[6] = (change_seq >> 16) & 0xFF;
    data[7] = (change_seq >> 24) & 0xFF;
    break;
}
```

### Client Implementation

```typescript
// Poll every 2 seconds
setInterval(async () => {
  const status = await usb.sendViable(0x1B, []);
  const flags = status[2] | (status[3] << 8);
  const seq = status[4] | (status[5] << 8) | (status[6] << 16) | (status[7] << 24);

  if (flags !== 0) {
    await handleChanges(flags);
    await usb.sendViable(0x1C, [flags & 0xff, (flags >> 8) & 0xff]);
  }
}, 2000);
```

### Trade-offs

| Aspect | Assessment |
|--------|------------|
| Latency | 0-2 seconds (depends on poll interval) |
| Bandwidth | Wasted when nothing changes |
| Firmware complexity | Low |
| Firmware RAM | ~12 bytes per client |
| Scales with clients | Poorly (N clients × poll rate) |
| VIA3 compatible | Yes (no unsolicited messages) |

---

## Approach B: Event-Based (Push)

### Overview

Firmware broadcasts a notification packet when state changes. Uses the existing raw HID interrupt IN endpoint.

### Protocol

**Broadcast Notification (unsolicited, firmware → all clients):**
```
[0xDD][0x00000000][0xEE][flags:2 LE][seq:4 LE]
       ^broadcast   ^notify protocol
```

- `0x00000000` = Broadcast client ID (already reserved for bootstrap)
- `0xEE` = New "notification" protocol type

**Polling fallback** (same as Approach A):
```
get_change_seq (0x1D): [0xDF][0x1D] → [0xDF][0x1D][seq:4 LE]
```

### Firmware Implementation

```c
#include "raw_hid.h"
#include "host.h"

static uint32_t change_seq = 0;
static bool viable_clients_active = false;  // True after first client bootstrap

// Called when any state changes
void viable_notify_change(uint32_t source_client_id, uint16_t categories) {
    if (categories == 0) return;
    change_seq++;

    // Only broadcast if Viable clients are active (avoid confusing VIA3 clients)
    if (!viable_clients_active) return;

    uint8_t data[32] = {0};
    data[0] = 0xDD;                        // Wrapper prefix
    data[1] = 0; data[2] = 0;              // Broadcast client ID = 0
    data[3] = 0; data[4] = 0;
    data[5] = 0xEE;                        // Notification protocol
    data[6] = categories & 0xFF;
    data[7] = (categories >> 8) & 0xFF;
    data[8] = change_seq & 0xFF;
    data[9] = (change_seq >> 8) & 0xFF;
    data[10] = (change_seq >> 16) & 0xFF;
    data[11] = (change_seq >> 24) & 0xFF;

    host_raw_hid_send(data, 32);
}

// Set flag when first client bootstraps
void client_wrapper_on_bootstrap(void) {
    viable_clients_active = true;
}
```

### Client Implementation

```typescript
class NotifyService {
  private lastSeq = 0;

  // Called for every HID message received
  handleRawMessage(data: Uint8Array): boolean {
    // Check for broadcast notification
    if (data[0] === 0xDD &&
        data[1] === 0 && data[2] === 0 && data[3] === 0 && data[4] === 0 &&
        data[5] === 0xEE) {
      const flags = data[6] | (data[7] << 8);
      const seq = data[8] | (data[9] << 8) | (data[10] << 16) | (data[11] << 24);

      if (seq !== this.lastSeq) {
        this.lastSeq = seq;
        this.emit('change', flags);
      }
      return true;  // Message handled
    }
    return false;  // Not a notification, pass to normal handler
  }

  // Fallback: poll for sequence on connect or if notifications seem stale
  async checkForMissedChanges(): Promise<void> {
    const response = await this.usb.sendViable(0x1D, []);
    const seq = response[2] | (response[3] << 8) | (response[4] << 16) | (response[5] << 24);
    if (seq !== this.lastSeq) {
      // Missed some changes, do full refresh
      this.lastSeq = seq;
      this.emit('change', 0xFFFF);  // Refresh everything
    }
  }
}
```

### Trade-offs

| Aspect | Assessment |
|--------|------------|
| Latency | Instant |
| Bandwidth | Only when changes occur |
| Firmware complexity | Moderate |
| Firmware RAM | ~4 bytes (just sequence) |
| Scales with clients | Well (1 broadcast serves all) |
| VIA3 compatible | Conditional (see below) |

---

## VIA3 Compatibility

### The Concern

Pure VIA3 clients (without Viable wrapper) might receive unsolicited `0xDD` broadcast messages and be confused.

### Analysis

- VIA3 expects messages starting with `0xFE` (response to its requests)
- Broadcast notifications start with `0xDD`
- Well-behaved VIA3 clients should ignore messages with unexpected prefixes
- However, some implementations might not handle unsolicited messages gracefully

### Mitigation (Approach B)

1. **Only broadcast when Viable clients are active**
   - Track whether any client has bootstrapped with client ID
   - Don't send broadcasts until first bootstrap
   - If only VIA3 clients are connected, they won't see broadcasts

2. **Graceful degradation**
   - If VIA3 client misbehaves, user can disable Viable multi-client features
   - Not expected to be a real issue in practice

### Recommendation

The conditional broadcast approach (only when Viable clients active) provides good compatibility while still enabling push notifications.

---

## Comparison Summary

| Aspect | Approach A (Polling) | Approach B (Push) |
|--------|---------------------|-------------------|
| Latency | 0-2 seconds | Instant |
| Bandwidth efficiency | Poor | Excellent |
| Firmware complexity | Low | Moderate |
| Firmware RAM | ~12 bytes/client | ~4 bytes total |
| Client complexity | Timer + polling | Message filtering |
| Multi-client scaling | O(N) traffic | O(1) traffic |
| VIA3 safe | Yes | Yes (with flag) |
| Works if client misses message | Yes (next poll) | Needs fallback poll |

---

## Recommendation

**Implement Approach B (push) with Approach A fallback:**

1. **Primary mechanism**: Broadcast push notifications for instant sync
2. **Fallback**: `get_change_seq` poll command (0x1D) for:
   - Clients that just connected (may have missed broadcasts)
   - Periodic sanity check (every 30s) to catch any missed notifications
   - Clients that prefer polling over push

This gives the best of both worlds: instant notifications in normal operation, with robustness for edge cases.

---

## Integration Points

Each feature's `set` command calls `viable_notify_change()`:

```c
case CMD_VIA_SET_KEYCODE:
    // ... set keycode ...
    viable_notify_change(client_id, VIABLE_CHANGE_KEYMAP);
    break;

case viable_cmd_cosmetic_name_set:
    // ... set name ...
    viable_notify_change(client_id, VIABLE_CHANGE_NAMES);
    break;

case viable_cmd_combo_set:
    // ... set combo ...
    viable_notify_change(client_id, VIABLE_CHANGE_COMBOS);
    break;
```

---

## Open Questions

1. **Broadcast timing**: Should broadcasts be immediate or debounced (e.g., 50ms delay to batch rapid changes)?
2. **Layer state**: Should active layer changes trigger notifications? They're frequent and might spam.
3. **Conflict resolution**: Last-write-wins is implicit. Is explicit conflict detection needed?
4. **Testing**: How to test multi-client scenarios reliably?

---

## References

- Viable client wrapper: `viable-qmk/modules/viable-kb/core/client_wrapper.c`
- Raw HID send: `viable-qmk/quantum/raw_hid.c`
- Layer state commands: `viable-qmk/modules/viable-kb/core/viable.c:483-502`
- Layer monitor (polling example): https://github.com/ilc/layer_monitor
- USB interrupt IN endpoint: `viable-qmk/tmk_core/protocol/chibios/usb_endpoints.c:77`
- Command IDs available: 0x1B-0x1F (polling), 0xEE protocol type (push)
- Related: `cosmetic-names-proposal.md`
