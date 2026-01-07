import { FC, useEffect } from "react";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { getKeyContents } from "@/utils/keys";
import { ArrowRight } from "lucide-react";
import { Key } from "@/components/Key";

interface Props { }

const ComboEditor: FC<Props> = () => {
    const { keyboard } = useVial();
    const { setPanelToGoBack, setAlternativeHeader, itemToEdit } = usePanels();
    const { selectComboKey, selectedTarget } = useKeyBinding();
    const currCombo = (keyboard as any).combos?.[itemToEdit!] as import("@/types/vial.types").ComboEntry;
    const keys = {
        0: getKeyContents(keyboard!, currCombo.keys[0]),
        1: getKeyContents(keyboard!, currCombo.keys[1]),
        2: getKeyContents(keyboard!, currCombo.keys[2]),
        3: getKeyContents(keyboard!, currCombo.keys[3]),
        4: getKeyContents(keyboard!, currCombo.output),
    };

    // Check if a specific combo slot is selected
    const isSlotSelected = (slot: number) => {
        return selectedTarget?.type === "combo" && selectedTarget.comboId === itemToEdit && selectedTarget.comboSlot === slot;
    };

    useEffect(() => {
        setPanelToGoBack("combos");
        setAlternativeHeader(true);
        console.log("currCombo", currCombo);
    }, []);

    const renderKey = (content: any, slot: number) => {
        const isSelected = isSlotSelected(slot);
        const hasContent = (content?.top && content.top !== "KC_NO") || (content?.str && content.str !== "KC_NO" && content.str !== "");

        let keyColor: string | undefined;
        let keyClassName: string;
        let headerClass: string;

        if (isSelected) {
            keyColor = undefined;
            keyClassName = "border-2 border-red-600";
            headerClass = "bg-black/20";
        } else if (hasContent) {
            keyColor = "sidebar";
            keyClassName = "border-kb-gray";
            headerClass = "bg-kb-sidebar-dark";
        } else {
            keyColor = undefined;
            keyClassName = "bg-transparent border-2 border-black";
            headerClass = "text-black";
        }

        return (
            <div className="relative w-[60px] h-[60px]">
                <Key
                    isRelative
                    x={0} y={0} w={1} h={1} row={-1} col={-1}
                    keycode={content?.top || "KC_NO"}
                    label={content?.str || ""}
                    keyContents={content}
                    selected={isSelected}
                    onClick={() => selectComboKey(itemToEdit!, slot)}
                    layerColor={keyColor}
                    className={keyClassName}
                    headerClassName={headerClass}
                />
            </div>
        );
    };

    return (
        <div className="flex flex-row items-center px-20 gap-8 pt-5">
            <div className="flex flex-col gap-0 py-8">
                {renderKey(keys[0], 0)}
                <div className="text-center text-xl">+</div>
                {renderKey(keys[1], 1)}
                <div className="text-center text-xl">+</div>
                {renderKey(keys[2], 2)}
                <div className="text-center text-xl">+</div>
                {renderKey(keys[3], 3)}
            </div>
            <ArrowRight className="h-6 w-6 flex-shrink-0" />
            <div className="flex flex-col gap-6 py-8 flex-shrink-1">
                {renderKey(keys[4], 4)}
            </div>
        </div>
    );
};

export default ComboEditor;
