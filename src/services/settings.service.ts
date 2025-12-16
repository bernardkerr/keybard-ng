import { SettingsState } from "@/types/settings.types";

export class SettingsService {
    private readonly storageKey = "keyboard-settings";

    load(): SettingsState {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn("Failed to load settings from localStorage:", error);
        }
        return {};
    }

    save(settings: SettingsState): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(settings));
        } catch (error) {
            console.error("Failed to save settings to localStorage:", error);
        }
    }

    clear(): void {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.error("Failed to clear settings from localStorage:", error);
        }
    }
}
