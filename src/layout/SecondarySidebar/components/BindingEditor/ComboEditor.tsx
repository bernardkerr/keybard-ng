import { FC, useEffect } from "react";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { getKeyContents } from "@/utils/keys";
import { ArrowRight } from "lucide-react";
import EditorKey from "../EditorKey";

interface Props {}

const ComboEditor: FC<Props> = () => {
    const { keyboard } = useVial();
    const { setActivePanel, setPanelToGoBack, setAlternativeHeader, itemToEdit } = usePanels();
    const { selectComboKey, selectedTarget } = useKeyBinding();
    const currCombo = (keyboard as any).combos?.[itemToEdit!];
    const keys = {
        0: getKeyContents(keyboard!, currCombo["0"]),
        1: getKeyContents(keyboard!, currCombo["1"]),
        2: getKeyContents(keyboard!, currCombo["2"]),
        3: getKeyContents(keyboard!, currCombo["3"]),
        4: getKeyContents(keyboard!, currCombo["4"]),
    };

    // Check if a specific combo slot is selected
    const isSlotSelected = (slot: number) => {
        return selectedTarget?.type === "combo" && selectedTarget.comboId === itemToEdit && selectedTarget.comboSlot === slot;
    };

    useEffect(() => {
        setActivePanel("layers");
        setPanelToGoBack("combos");
        setAlternativeHeader(true);
        console.log("currCombo", currCombo);
    }, []);

    return (
        <div className="flex flex-row items-center px-20 gap-8 pt-5">
            <div className="flex flex-col gap-0 py-8">
                <EditorKey binding={keys["0"]} onClick={() => selectComboKey(itemToEdit!, 0)} selected={isSlotSelected(0)} />
                <div className="text-center text-xl">+</div>
                <EditorKey binding={keys["1"]} onClick={() => selectComboKey(itemToEdit!, 1)} selected={isSlotSelected(1)} />
                <div className="text-center text-xl">+</div>
                <EditorKey binding={keys["2"]} onClick={() => selectComboKey(itemToEdit!, 2)} selected={isSlotSelected(2)} />
                <div className="text-center text-xl">+</div>
                <EditorKey binding={keys["3"]} onClick={() => selectComboKey(itemToEdit!, 3)} selected={isSlotSelected(3)} />
            </div>
            <ArrowRight className="h-6 w-6 flex-shrink-0" />
            <div className="flex flex-col gap-6 py-8 flex-shrink-1">
                <EditorKey binding={keys["4"]} onClick={() => selectComboKey(itemToEdit!, 4)} selected={isSlotSelected(4)} />
            </div>
        </div>
    );
};

export default ComboEditor;
