import { FC, useEffect } from "react";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { getKeyContents } from "@/utils/keys";
import EditorKey from "../EditorKey";

interface Props {}

const TapdanceEditor: FC<Props> = () => {
    const { keyboard } = useVial();
    const { setActivePanel, setPanelToGoBack, setAlternativeHeader, itemToEdit } = usePanels();
    const currTapDance = (keyboard as any).tapdances?.[itemToEdit!];
    const { selectTapdanceKey, selectedTarget } = useKeyBinding();
    console.log("selectedTarget", selectedTarget);
    const isSlotSelected = (slot: string) => {
        return selectedTarget?.type === "tapdance" && selectedTarget.tapdanceId === itemToEdit && selectedTarget.tapdanceSlot === slot;
    };
    const keys = {
        tap: getKeyContents(keyboard!, currTapDance.tap),
        doubletap: getKeyContents(keyboard!, currTapDance.doubletap),
        hold: getKeyContents(keyboard!, currTapDance.hold),
        taphold: getKeyContents(keyboard!, currTapDance.taphold),
    };
    useEffect(() => {
        setActivePanel("layers");
        setPanelToGoBack("tapdances");
        setAlternativeHeader(true);
    }, []);

    return (
        <div className="px-15 flex flex-col gap-6 py-8">
            <EditorKey label="Tap" binding={keys.tap!} onClick={() => selectTapdanceKey(itemToEdit!, "tap")} selected={isSlotSelected("tap")} />
            <EditorKey label="Hold" binding={keys.hold!} onClick={() => selectTapdanceKey(itemToEdit!, "hold")} selected={isSlotSelected("hold")} />
            <EditorKey label="Double-Tap" binding={keys.doubletap!} onClick={() => selectTapdanceKey(itemToEdit!, "doubletap")} selected={isSlotSelected("doubletap")} />
            <EditorKey label="Tap-Hold" binding={keys.taphold!} onClick={() => selectTapdanceKey(itemToEdit!, "taphold")} selected={isSlotSelected("taphold")} />
        </div>
    );
};

export default TapdanceEditor;
