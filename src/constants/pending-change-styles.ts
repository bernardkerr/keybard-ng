/**
 * Visual styles for keys with pending changes
 * These can be easily tweaked to adjust the appearance
 */

export const PENDING_CHANGE_STYLES = {
    // Ring/outline style (outer ring around the key)
    ring: {
        enabled: false,
        className: "ring-2 ring-red-500/70 ring-offset-1 ring-offset-transparent",
    },

    // Shadow glow style (alternative or combined with ring)
    shadow: {
        enabled: false,
        className: "shadow-[0_0_8px_2px_rgba(239,68,68,0.4)]",
    },

    // Background tint style
    backgroundTint: {
        enabled: false,
        className: "bg-red-100/20",
    },

    // Border color override (uses the key's own border, like hover effect)
    border: {
        enabled: true,
        className: "border-red-500",
    },

    // Pulsing animation
    pulse: {
        enabled: false,
        className: "animate-pulse",
    },
} as const;

/**
 * Get the combined className for pending change styling
 * Only includes enabled styles
 */
export function getPendingChangeClassName(): string {
    const classes: string[] = [];

    if (PENDING_CHANGE_STYLES.ring.enabled) {
        classes.push(PENDING_CHANGE_STYLES.ring.className);
    }
    if (PENDING_CHANGE_STYLES.shadow.enabled) {
        classes.push(PENDING_CHANGE_STYLES.shadow.className);
    }
    if (PENDING_CHANGE_STYLES.backgroundTint.enabled) {
        classes.push(PENDING_CHANGE_STYLES.backgroundTint.className);
    }
    if (PENDING_CHANGE_STYLES.border.enabled) {
        classes.push(PENDING_CHANGE_STYLES.border.className);
    }
    if (PENDING_CHANGE_STYLES.pulse.enabled) {
        classes.push(PENDING_CHANGE_STYLES.pulse.className);
    }

    return classes.join(" ");
}
