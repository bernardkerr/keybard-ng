import DynamicMenuPanel from "./DynamicMenuPanel";
import MouseKeysSection from "./MouseKeysSection";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { useVial } from "@/contexts/VialContext";
import DescriptionBlock from "@/layout/SecondarySidebar/components/DescriptionBlock";

/**
 * Unified Pointing Devices panel
 * - When disconnected: shows placeholder text
 * - When connected: shows Mouse Keys section at top, then dynamic VIA3 menu content
 */
const PointingPanel = () => {
    const { keyboard, isConnected, connect } = useVial();
    const { layoutMode } = useLayoutSettings();
    const isHorizontal = layoutMode === "bottombar";

    // Find the pointing device menu from keyboard definition
    // Support both "Pointing Device" (singular) and "Pointing Devices" (plural)
    const pointingMenuIndex = keyboard?.menus?.findIndex(
        (menu) => menu.label?.toLowerCase().includes('pointing')
    ) ?? -1;

    // Not connected
    if (!isConnected) {
        return (
            <section className="h-full flex flex-col pt-2">
                <DescriptionBlock>
                    <button
                        onClick={() => connect()}
                        className="underline underline-offset-2 hover:text-foreground transition-all text-inherit"
                    >
                        Connect
                    </button>
                    {" keyboard to view pointing devices settings."}
                </DescriptionBlock>
            </section>
        );
    }

    // Horizontal layout for bottom panel
    if (isHorizontal) {
        return (
            <div className="flex flex-row gap-3 h-full items-start flex-wrap content-start">
                <MouseKeysSection compact variant="medium" />
                {pointingMenuIndex !== -1 && (
                    <DynamicMenuPanel menuIndex={pointingMenuIndex} horizontal />
                )}
            </div>
        );
    }

    // Vertical layout for sidebar
    return (
        <section className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
                <DescriptionBlock>
                    Emulate a mouse using the Mouse Button keys, adjust the Track Ball speed with the Sniper keys, and adjust the settings for your pointing devices.
                </DescriptionBlock>
                {/* Mouse Keys section at top */}
                <div className="pb-4">
                    <MouseKeysSection />
                </div>

                {/* Dynamic menu content below */}
                {pointingMenuIndex !== -1 ? (
                    <DynamicMenuPanel menuIndex={pointingMenuIndex} />
                ) : (
                    <p className="text-muted-foreground text-center">
                        This keyboard does not have additional pointing device settings
                    </p>
                )}
            </div>
        </section>
    );
};

export default PointingPanel;
