import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

export type KeyVariant = "default" | "medium" | "small";
export type LayoutMode = "sidebar" | "bottombar";

// Approximate keyboard widths at each size (Svalboard layout)
// Measured from screenshot: medium ~1200px, scale proportionally
const KEYBOARD_WIDTH = {
    default: 1400,  // 60px keys (1200 * 60/45 ≈ 1600, but layout gaps don't scale linearly)
    medium: 1100,   // 45px keys (measured ~1200, slight buffer)
    small: 750,     // 30px keys (1200 * 30/45 = 800, minus some)
};

// Sidebar widths (from sidebar.tsx CSS variables)
const PRIMARY_SIDEBAR_EXPANDED = 188; // 11.75rem
const PRIMARY_SIDEBAR_COLLAPSED = 48; // 3rem
const SECONDARY_SIDEBAR_WIDTH = 450;
const LAYOUT_MARGINS = 40; // Buffer for container padding

interface LayoutSettingsContextType {
    internationalLayout: string;
    setInternationalLayout: (layout: string) => void;
    keyVariant: KeyVariant;
    setKeyVariant: (variant: KeyVariant) => void;
    layoutMode: LayoutMode;
    setLayoutMode: (mode: LayoutMode) => void;
    isAutoLayoutMode: boolean;
    setIsAutoLayoutMode: (auto: boolean) => void;
    isAutoKeySize: boolean;
    setIsAutoKeySize: (auto: boolean) => void;
    setSecondarySidebarOpen: (open: boolean) => void;
    setPrimarySidebarExpanded: (expanded: boolean) => void;
    // Callback for EditorLayout to provide - allows context to request sidebar collapse
    registerPrimarySidebarControl: (collapse: () => void) => void;
}

const LayoutSettingsContext = createContext<LayoutSettingsContextType | undefined>(undefined);

export const LayoutSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [internationalLayout, setInternationalLayout] = useState<string>("us");
    const [keyVariant, setKeyVariantState] = useState<KeyVariant>("default");
    const [layoutMode, setLayoutModeState] = useState<LayoutMode>("sidebar");
    const [isAutoLayoutMode, setIsAutoLayoutMode] = useState<boolean>(true);
    const [manualLayoutMode, setManualLayoutMode] = useState<LayoutMode>("sidebar");
    const [isAutoKeySize, setIsAutoKeySize] = useState<boolean>(true);
    const [manualKeyVariant, setManualKeyVariant] = useState<KeyVariant>("default");
    const [secondarySidebarOpen, setSecondarySidebarOpenState] = useState<boolean>(false);
    const [primarySidebarExpanded, setPrimarySidebarExpandedState] = useState<boolean>(true);
    const [collapsePrimarySidebar, setCollapsePrimarySidebar] = useState<(() => void) | null>(null);

    // Use refs to track current values without triggering re-renders during calculation
    const secondarySidebarOpenRef = useRef(false);
    const primarySidebarExpandedRef = useRef(true);
    const isUpdatingRef = useRef(false);

    const setSecondarySidebarOpen = useCallback((open: boolean) => {
        if (secondarySidebarOpenRef.current !== open) {
            secondarySidebarOpenRef.current = open;
            setSecondarySidebarOpenState(open);
        }
    }, []);

    const setPrimarySidebarExpanded = useCallback((expanded: boolean) => {
        if (primarySidebarExpandedRef.current !== expanded) {
            primarySidebarExpandedRef.current = expanded;
            setPrimarySidebarExpandedState(expanded);
        }
    }, []);

    const registerPrimarySidebarControl = useCallback((collapse: () => void) => {
        setCollapsePrimarySidebar(() => collapse);
    }, []);

    // Calculate available width for keyboard
    const getAvailableWidth = useCallback((windowWidth: number, mode: LayoutMode, sidebarOpen: boolean, primaryExpanded: boolean): number => {
        const primarySidebar = primaryExpanded ? PRIMARY_SIDEBAR_EXPANDED : PRIMARY_SIDEBAR_COLLAPSED;
        if (mode === "bottombar") {
            // Bottom bar mode: full width minus primary sidebar
            return windowWidth - primarySidebar - LAYOUT_MARGINS;
        }
        // Sidebar mode: account for secondary sidebar if open
        const secondarySidebar = sidebarOpen ? SECONDARY_SIDEBAR_WIDTH : 0;
        return windowWidth - primarySidebar - secondarySidebar - LAYOUT_MARGINS;
    }, []);

    // Determine best key size that fits without occlusion
    const getBestKeySize = useCallback((availableWidth: number): KeyVariant => {
        if (availableWidth >= KEYBOARD_WIDTH.default) return "default";
        if (availableWidth >= KEYBOARD_WIDTH.medium) return "medium";
        return "small";
    }, []);

    // Check if keyboard fits at given size
    const keyboardFits = useCallback((availableWidth: number, size: KeyVariant): boolean => {
        return availableWidth >= KEYBOARD_WIDTH[size];
    }, []);

    // Handle auto-switching based on available space
    const updateAutoLayout = useCallback(() => {
        // Prevent re-entry during update
        if (isUpdatingRef.current) return;
        if (!isAutoLayoutMode && !isAutoKeySize) return;

        isUpdatingRef.current = true;

        try {
            const windowWidth = window.innerWidth;
            const secondaryOpen = secondarySidebarOpenRef.current;
            const primaryExpanded = primarySidebarExpandedRef.current;

            // Calculate available space in different configurations
            const sidebarExpandedNoSecondary = getAvailableWidth(windowWidth, "sidebar", false, true);
            const sidebarExpandedWithSecondary = getAvailableWidth(windowWidth, "sidebar", true, true);
            const sidebarCollapsedNoSecondary = getAvailableWidth(windowWidth, "sidebar", false, false);
            const sidebarCollapsedWithSecondary = getAvailableWidth(windowWidth, "sidebar", true, false);
            const bottomBarAvailable = getAvailableWidth(windowWidth, "bottombar", false, false);

            // Determine what configuration we need:
            // 1. Try current sidebar state first
            // 2. If small doesn't fit, collapse the sidebar
            // 3. If small still doesn't fit collapsed, switch to bottom bar

            let targetSidebarExpanded = primaryExpanded;
            let useSidebarMode = true;

            // Check with current sidebar state
            const currentSidebarAvailable = primaryExpanded
                ? (secondaryOpen ? sidebarExpandedWithSecondary : sidebarExpandedNoSecondary)
                : (secondaryOpen ? sidebarCollapsedWithSecondary : sidebarCollapsedNoSecondary);

            if (!keyboardFits(currentSidebarAvailable, "small")) {
                // Small doesn't fit - try collapsing primary sidebar if expanded
                if (primaryExpanded) {
                    const collapsedAvailable = secondaryOpen ? sidebarCollapsedWithSecondary : sidebarCollapsedNoSecondary;

                    if (keyboardFits(collapsedAvailable, "small")) {
                        // Collapsing sidebar makes it fit - request collapse
                        targetSidebarExpanded = false;
                        if (collapsePrimarySidebar) {
                            setTimeout(() => collapsePrimarySidebar(), 0);
                        }
                    } else {
                        // Even collapsed doesn't fit - switch to bottom bar
                        useSidebarMode = false;
                    }
                } else {
                    // Already collapsed and still doesn't fit - switch to bottom bar
                    useSidebarMode = false;
                }
            }

            if (isAutoLayoutMode) {
                setLayoutModeState(useSidebarMode ? "sidebar" : "bottombar");
            }

            // For key size: use actual available space based on decided mode
            if (isAutoKeySize) {
                if (useSidebarMode) {
                    const actualAvailable = targetSidebarExpanded
                        ? (secondaryOpen ? sidebarExpandedWithSecondary : sidebarExpandedNoSecondary)
                        : (secondaryOpen ? sidebarCollapsedWithSecondary : sidebarCollapsedNoSecondary);
                    setKeyVariantState(getBestKeySize(actualAvailable));
                } else {
                    setKeyVariantState(getBestKeySize(bottomBarAvailable));
                }
            }
        } finally {
            // Use setTimeout to reset the flag after the render cycle completes
            setTimeout(() => { isUpdatingRef.current = false; }, 0);
        }
    }, [isAutoLayoutMode, isAutoKeySize, collapsePrimarySidebar, getAvailableWidth, getBestKeySize, keyboardFits]);

    // Listen for window resize
    useEffect(() => {
        const handleResize = () => {
            updateAutoLayout();
        };

        // Set initial value
        updateAutoLayout();

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [updateAutoLayout]);

    // Re-run auto layout when sidebar states change
    // Using state values here is safe because they're debounced by the refs
    useEffect(() => {
        updateAutoLayout();
    }, [secondarySidebarOpen, primarySidebarExpanded, updateAutoLayout]);

    // Sync refs when state changes (in case setState was called directly)
    useEffect(() => {
        secondarySidebarOpenRef.current = secondarySidebarOpen;
    }, [secondarySidebarOpen]);

    useEffect(() => {
        primarySidebarExpandedRef.current = primarySidebarExpanded;
    }, [primarySidebarExpanded]);

    // When auto mode is disabled, use the manual setting
    useEffect(() => {
        if (!isAutoLayoutMode) {
            setLayoutModeState(manualLayoutMode);
        }
    }, [isAutoLayoutMode, manualLayoutMode]);

    // When auto key size is disabled, use the manual setting
    useEffect(() => {
        if (!isAutoKeySize) {
            setKeyVariantState(manualKeyVariant);
        }
    }, [isAutoKeySize, manualKeyVariant]);

    // Wrapper to handle manual mode changes
    const setLayoutMode = useCallback((mode: LayoutMode) => {
        setManualLayoutMode(mode);
        setIsAutoLayoutMode(false); // Disable auto when user manually selects
        setLayoutModeState(mode);
    }, []);

    // Wrapper to handle manual key variant changes
    const setKeyVariant = useCallback((variant: KeyVariant) => {
        setManualKeyVariant(variant);
        setIsAutoKeySize(false); // Disable auto when user manually selects
        setKeyVariantState(variant);
    }, []);

    return (
        <LayoutSettingsContext.Provider value={{
            internationalLayout,
            setInternationalLayout,
            keyVariant,
            setKeyVariant,
            layoutMode,
            setLayoutMode,
            isAutoLayoutMode,
            setIsAutoLayoutMode,
            isAutoKeySize,
            setIsAutoKeySize,
            setSecondarySidebarOpen,
            setPrimarySidebarExpanded,
            registerPrimarySidebarControl,
        }}>
            {children}
        </LayoutSettingsContext.Provider>
    );
};

export const useLayoutSettings = () => {
    const context = useContext(LayoutSettingsContext);
    if (!context) {
        throw new Error("useLayoutSettings must be used within a LayoutSettingsProvider");
    }
    return context;
};
