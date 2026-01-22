import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import AudioKeys from "./AudioKeys";
import BacklightsKeys from "./BacklightsKeys";
import MediaKeys from "./MediaKeys";
import StenoKeys from "./StenoKeys";

interface Props {
    isPicker?: boolean;
}

const SpecialKeysPanel = ({ isPicker }: Props) => {
    const { layoutMode } = useLayoutSettings();
    const isHorizontal = layoutMode === "bottombar";

    if (isHorizontal) {
        return (
            <div className="flex flex-row gap-3 h-full items-start flex-wrap content-start">
                <MediaKeys compact />
                <AudioKeys compact />
                <StenoKeys compact />
                <BacklightsKeys compact />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {isPicker && (
                <div className="pb-2">
                    <span className="font-semibold text-xl text-slate-700">Special Keys</span>
                </div>
            )}
            <MediaKeys />
            <AudioKeys />
            <StenoKeys />
            <BacklightsKeys />
        </div>
    );
};

export default SpecialKeysPanel;
