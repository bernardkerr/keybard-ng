import "./BindingEditorContainer.css";

import { FC, useCallback, useState, useEffect } from "react";

import ComboIcon from "@/components/ComboIcon";
import MacrosIcon from "@/components/icons/MacrosIcon";
import OverridesIcon from "@/components/icons/Overrides";
import { usePanels } from "@/contexts/PanelsContext";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import ComboEditor from "./ComboEditor";
import MacroEditor from "./MacroEditor";
import OverrideEditor from "./OverrideEditor";
import TapdanceEditor from "./TapdanceEditor";
import { useVial } from "@/contexts/VialContext";
import { getKeyContents } from "@/utils/keys";
import { Key } from "@/components/Key";
import { KeyContent } from "@/types/vial.types";

interface Props {
    shouldClose?: boolean;
}

const icons = {
    macros: <MacrosIcon />,
    combos: <ComboIcon />,
    overrides: <OverridesIcon />,
};

const labels = {
    tapdances: "Tap Dance Keys",
    macros: "Macro Key",
    combos: "Combo Keys",
    overrides: "Override",
};

const BindingEditorContainer: FC<Props> = ({ shouldClose }) => {
    const { itemToEdit, handleCloseEditor, bindingTypeToEdit } = usePanels();
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (shouldClose && !isClosing) {
            setIsClosing(true);
        }
    }, [shouldClose, isClosing]);

    const handleAnimatedClose = useCallback(() => {
        if (isClosing) {
            return;
        }

        setIsClosing(true);
    }, [isClosing]);

    const handleAnimationEnd = useCallback(() => {
        if (isClosing) {
            handleCloseEditor();
        }
    }, [handleCloseEditor, isClosing]);

    const { keyboard } = useVial();

    const containerClasses = cn("absolute top-1/2 -translate-y-1/2", bindingTypeToEdit === "overrides" ? "w-[500px] right-[-500px]" : "w-[400px] right-[-400px]");
    const panelClasses = cn("binding-editor bg-kb-gray-medium rounded-r-2xl p-5 flex flex-col w-full min-h-[500px] shadow-[4px_0_16px_rgba(0,0,0,0.1)]", isClosing ? "binding-editor--exit" : "binding-editor--enter");

    const renderHeaderIcon = () => {
        if (bindingTypeToEdit === "tapdances" && itemToEdit !== null && keyboard) {
            const keycode = `TD(${itemToEdit})`;
            const keyContents = getKeyContents(keyboard, keycode) as KeyContent;
            return (
                <div className="relative w-14 h-14">
                    <Key
                        isRelative
                        x={0}
                        y={0}
                        w={1}
                        h={1}
                        row={-1}
                        col={-1}
                        keycode={keycode}
                        label={itemToEdit.toString()}
                        keyContents={keyContents}
                        layerColor="sidebar"
                    />
                </div>
            );
        }

        const icon = (icons as any)[bindingTypeToEdit!];
        if (icon) {
            return (
                <div className="flex flex-col bg-black h-14 w-14 rounded-sm flex-shrink-0 items-center ">
                    <div className="h-5 w-5 mt-3 text-white">{icon}</div>
                    <span className="text-sm text-white">{itemToEdit}</span>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={containerClasses}>
            <div className={panelClasses} onAnimationEnd={handleAnimationEnd}>
                <div className="flex flex-row w-full items-center pr-5 pl-[76px] justify-between pt-2">
                    <div className="flex flex-row items-center">
                        {renderHeaderIcon()}
                        <div className="pl-5 text-xl font-normal">{(labels as any)[bindingTypeToEdit!]}</div>
                    </div>
                    <button
                        type="button"
                        onClick={handleAnimatedClose}
                        className="rounded-sm p-1 text-kb-gray-border transition-all hover:text-black focus:outline-none focus:text-black cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {bindingTypeToEdit === "tapdances" && <TapdanceEditor />}
                {bindingTypeToEdit === "combos" && <ComboEditor />}
                {bindingTypeToEdit === "overrides" && <OverrideEditor />}
                {bindingTypeToEdit === "macros" && <MacroEditor />}
            </div>
        </div>
    );
};

export default BindingEditorContainer;
