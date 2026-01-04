import { FC, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { getKeyContents } from "@/utils/keys";
import { useDebounce } from "@uidotdev/usehooks";
import EditorKey from "../EditorKey";

interface Props { }

const TapdanceEditor: FC<Props> = () => {
    const { keyboard, setKeyboard } = useVial();
    const { setPanelToGoBack, setAlternativeHeader, itemToEdit } = usePanels();
    const currTapDance = (keyboard as any).tapdances?.[itemToEdit!];
    const { selectTapdanceKey, selectedTarget } = useKeyBinding();
    const isSlotSelected = (slot: string) => {
        return selectedTarget?.type === "tapdance" && selectedTarget.tapdanceId === itemToEdit && selectedTarget.tapdanceSlot === slot;
    };
    const [tapMs, setTapMs] = useState(200);
    const debouncedTapMs = useDebounce(tapMs, 300);
    useEffect(() => {
        if (currTapDance) {
            setTapMs(currTapDance.tapms);
        }
    }, []);
    const keys = {
        tap: getKeyContents(keyboard!, currTapDance.tap),
        doubletap: getKeyContents(keyboard!, currTapDance.doubletap),
        hold: getKeyContents(keyboard!, currTapDance.hold),
        taphold: getKeyContents(keyboard!, currTapDance.taphold),
    };
    console.log("Rendering TapdanceEditor for tapdance:", itemToEdit, "with keys:", keys, "and currTapDance:", currTapDance);
    useEffect(() => {
        setPanelToGoBack("tapdances");
        setAlternativeHeader(true);
    }, []);

    const updateTapMs = (ms: number) => {
        if (keyboard && (keyboard as any).tapdances && itemToEdit !== null) {
            const updatedKeyboard = { ...keyboard };
            const tapdances = [...(updatedKeyboard as any).tapdances];
            if (tapdances[itemToEdit]) {
                tapdances[itemToEdit] = {
                    ...tapdances[itemToEdit],
                    tapms: ms,
                };
            }
            (updatedKeyboard as any).tapdances = tapdances;
            setKeyboard(updatedKeyboard);
        }
    };
    useEffect(() => {
        updateTapMs(debouncedTapMs);
    }, [debouncedTapMs]);

    return (
        <div className="px-15 flex flex-col gap-6 py-8">
            <EditorKey label="Tap" binding={keys.tap!} onClick={() => selectTapdanceKey(itemToEdit!, "tap")} selected={isSlotSelected("tap")} />
            <EditorKey label="Hold" binding={keys.hold!} onClick={() => selectTapdanceKey(itemToEdit!, "hold")} selected={isSlotSelected("hold")} />
            <EditorKey label="Double-Tap" binding={keys.doubletap!} onClick={() => selectTapdanceKey(itemToEdit!, "doubletap")} selected={isSlotSelected("doubletap")} />
            <EditorKey label="Tap-Hold" binding={keys.taphold!} onClick={() => selectTapdanceKey(itemToEdit!, "taphold")} selected={isSlotSelected("taphold")} />
            <div className="flex flex-row gap-3 items-center">
                <span className="text-md font-normal text-slate-600">Milliseconds</span>
                <Input value={tapMs} type="number" onChange={(e) => setTapMs(e.target.valueAsNumber)} min={0} step={25} className="w-32 bg-white" placeholder="Tap MS" />
            </div>
        </div>
    );
};

export default TapdanceEditor;
