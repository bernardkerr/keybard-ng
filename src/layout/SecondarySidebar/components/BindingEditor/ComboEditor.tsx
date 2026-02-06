import { FC, useEffect } from "react";
import { ArrowRightFromLine, Plus } from "lucide-react";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";


import EditorKey from "./EditorKey";
import { ComboEntry } from "@/types/vial.types";

interface Props { }

const ComboEditor: FC<Props> = () => {
    const { keyboard, setKeyboard } = useVial();
    const { setPanelToGoBack, setAlternativeHeader, itemToEdit } = usePanels();
    const { selectComboKey, selectedTarget, assignKeycode } = useKeyBinding();
    const { layoutMode } = useLayoutSettings();
    const isHorizontal = layoutMode === "bottombar";
    const keySize = isHorizontal ? "w-[45px] h-[45px]" : "w-[50px] h-[50px]";
    const keyVariant = isHorizontal ? "medium" : "default";

    // Fix type assertion
    const currCombo = keyboard?.combos?.[itemToEdit!] as ComboEntry;

    // Check if a specific combo slot is selected
    const isSlotSelected = (slot: number) => {
        return selectedTarget?.type === "combo" && selectedTarget.comboId === itemToEdit && selectedTarget.comboSlot === slot;
    };

    useEffect(() => {
        setPanelToGoBack("combos");
        setAlternativeHeader(true);
    }, [setPanelToGoBack, setAlternativeHeader]);

    // Auto-select the first key slot whenever the itemToEdit changes
    useEffect(() => {
        if (itemToEdit !== null) {
            selectComboKey(itemToEdit, 0);
        }
    }, [itemToEdit, selectComboKey]);

    const updateComboAssignment = (slot: number, keycode: string) => {
        if (!keyboard || itemToEdit === null) return;
        const updatedKeyboard = { ...keyboard };
        const combos = [...(updatedKeyboard as any).combos];
        if (combos[itemToEdit]) {
            // Slot 0-3: keys array. Slot 4: output
            const combo = { ...combos[itemToEdit] };
            if (slot < 4) {
                const newKeys = [...combo.keys];
                newKeys[slot] = keycode;
                combo.keys = newKeys;
            } else {
                combo.output = keycode;
            }
            combos[itemToEdit] = combo;
        }
        (updatedKeyboard as any).combos = combos;
        setKeyboard(updatedKeyboard);
    };

    const renderComboKey = (keycode: string, slot: number) => {
        const isSelected = isSlotSelected(slot);
        const trashOffset = isHorizontal ? "-left-8" : "-left-10";
        const trashSize = isHorizontal ? "w-3 h-3" : "w-4 h-4";

        return (
            <div className="flex flex-col items-center gap-1">
                <EditorKey
                    keycode={keycode}
                    selected={isSelected}
                    onClick={() => selectComboKey(itemToEdit!, slot)}
                    onClear={() => {
                        selectComboKey(itemToEdit!, slot);
                        setTimeout(() => assignKeycode("KC_NO"), 0);
                    }}
                    onDrop={(item) => {
                        updateComboAssignment(slot, item.keycode);
                    }}
                    size={keySize}
                    trashOffset={trashOffset}
                    trashSize={trashSize}
                    variant={keyVariant}
                    wrapperClassName={`relative ${keySize} group/key`}
                    // We don't use the built-in EditorKey label, we render it externally for consistent positioning in grid
                    label={undefined}
                    labelClassName={undefined}
                />
            </div>
        );
    };

    if (!currCombo) return <div className="p-5">Combo entry not found</div>;

    // Horizontal layout: 2x2 grid of input keys + arrow + output
    if (isHorizontal) {
        return (
            <div className="flex flex-row items-center gap-6 px-6 py-3">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500 mb-1">Input Keys</span>
                    <div className="grid grid-cols-2 gap-2">
                        {renderComboKey(currCombo.keys[0], 0)}
                        {renderComboKey(currCombo.keys[1], 1)}
                        {renderComboKey(currCombo.keys[2], 2)}
                        {renderComboKey(currCombo.keys[3], 3)}
                    </div>
                </div>
                <ArrowRightFromLine className="h-5 w-5 flex-shrink-0 text-gray-600" />
                <div className="flex flex-col items-center">
                    <span className="text-xs font-medium text-slate-500 mb-1">Output</span>
                    {renderComboKey(currCombo.output, 4)}
                </div>
            </div>
        );
    }

    // ==========================================
    // VERTICAL BAR MODE (Sidebar)
    // ==========================================

    return (
        <div className="flex flex-col gap-8 py-6 pl-[84px] pr-5 pb-20">
            <div className="flex flex-col gap-3">
                <div className="flex flex-row flex-wrap gap-4 items-end">
                    {[0, 1, 2, 3].map((slotIdx) => (
                        <div key={slotIdx} className="flex flex-row items-end gap-4">
                            {slotIdx > 0 && (
                                <div className="h-[50px] flex items-center justify-center translate-y-1 translate-x-1">
                                    <Plus className="w-5 h-5 text-black" />
                                </div>
                            )}
                            {renderComboKey(currCombo.keys[slotIdx], slotIdx)}
                        </div>
                    ))}

                    {/* Output Key */}
                    <div className="flex flex-row gap-4 items-end">
                        <div className="h-[50px] flex items-center justify-center translate-y-1 translate-x-1">
                            <ArrowRightFromLine className="w-5 h-5 text-black" />
                        </div>
                        <div className="flex flex-col items-center gap-1 relative">
                            <span className="font-bold text-slate-600 text-sm">Output</span>
                            {renderComboKey(currCombo.output, 4)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground mt-2">
                Set 2-4 keys to press simultaneously to get the output key.
            </div>
        </div>
    );
};

export default ComboEditor;

