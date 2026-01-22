import React from "react";
import { ArrowRight } from "lucide-react";

import SidebarItemRow from "@/layout/SecondarySidebar/components/SidebarItemRow";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useVial } from "@/contexts/VialContext";
import { useLayer } from "@/contexts/LayerContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { usePanels } from "@/contexts/PanelsContext";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { getKeyContents } from "@/utils/keys";
import { Key } from "@/components/Key";
import { KeyContent, AltRepeatKeyOptions } from "@/types/vial.types";
import { vialService } from "@/services/vial.service";
import { cn } from "@/lib/utils";

const AltRepeatPanel: React.FC = () => {
    const { keyboard, setKeyboard } = useVial();
    const { selectAltRepeatKey, assignKeycode, isBinding } = useKeyBinding();
    const { selectedLayer } = useLayer();
    const { layoutMode } = useLayoutSettings();
    const {
        setItemToEdit,
        setBindingTypeToEdit,
        setAlternativeHeader,
        itemToEdit,
    } = usePanels();

    const isHorizontal = layoutMode === "bottombar";

    if (!keyboard) return null;

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses["primary"];

    const altRepeatKeys = keyboard.alt_repeat_keys || [];

    const handleEdit = (index: number) => {
        setItemToEdit(index);
        setBindingTypeToEdit("altrepeat");
        setAlternativeHeader(true);
    };

    const isEnabled = (options: number) => {
        return (options & AltRepeatKeyOptions.ENABLED) !== 0;
    };

    const handleToggleEnabled = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!keyboard.alt_repeat_keys) return;

        const entry = keyboard.alt_repeat_keys[index];
        const newOptions = entry.options ^ AltRepeatKeyOptions.ENABLED;

        const updatedKeys = [...keyboard.alt_repeat_keys];
        updatedKeys[index] = { ...entry, options: newOptions };

        const updatedKeyboard = {
            ...keyboard,
            alt_repeat_keys: updatedKeys,
        };
        setKeyboard(updatedKeyboard);

        try {
            await vialService.updateAltRepeatKey(updatedKeyboard, index);
            await vialService.saveViable(); // Persist to EEPROM
        } catch (err) {
            console.error("Failed to update alt repeat key:", err);
        }
    };

    const handleKeyClick = (index: number, slot: "keycode" | "alt_keycode") => {
        handleEdit(index);
        selectAltRepeatKey(index, slot);
    };

    const renderSmallKey = (keycode: string, index: number, slot: "keycode" | "alt_keycode", isEditing: boolean) => {
        const content = getKeyContents(keyboard, keycode) as KeyContent;
        const hasContent = keycode !== "KC_NO" && keycode !== "";
        const isSelected = isEditing && itemToEdit === index;

        return (
            <div className="relative w-[40px] h-[40px]">
                <Key
                    isRelative
                    x={0} y={0} w={1} h={1} row={-1} col={-1}
                    keycode={keycode}
                    label={content?.str || ""}
                    keyContents={content}
                    layerColor={hasContent ? "sidebar" : undefined}
                    className={cn(
                        hasContent ? "border-kb-gray" : "bg-transparent border border-kb-gray-border",
                        isSelected && "ring-2 ring-blue-500"
                    )}
                    headerClassName={hasContent ? "bg-kb-sidebar-dark" : "text-black"}
                    variant="small"
                    onClick={() => handleKeyClick(index, slot)}
                />
            </div>
        );
    };

    const handleAssignAltRepeatKey = () => {
        if (!isBinding) return;
        assignKeycode("QK_ALT_REPEAT_KEY");
    };

    // Custom key contents for the placeable key with explicit label
    const altRepeatKeyContents: KeyContent = { str: "Alt-Repeat", type: "special" };

    // Horizontal layout for bottom panel
    if (isHorizontal) {
        return (
            <div className="flex flex-row gap-3 h-full items-start flex-wrap content-start">
                {/* Alt-Repeat key */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Key</span>
                    <Key
                        isRelative
                        x={0} y={0} w={1} h={1} row={-1} col={-1}
                        keycode="QK_ALT_REPEAT_KEY"
                        label="Alt-Rep"
                        keyContents={altRepeatKeyContents}
                        layerColor="sidebar"
                        headerClassName="bg-kb-sidebar-dark"
                        variant="small"
                        onClick={handleAssignAltRepeatKey}
                    />
                </div>

                {/* Alt-repeat entries */}
                <div className="flex flex-row gap-2 flex-wrap items-start">
                    {altRepeatKeys.map((entry, i) => {
                        const enabled = isEnabled(entry.options);
                        const hasKeycode = entry.keycode !== "KC_NO" && entry.keycode !== "";
                        const hasAltKeycode = entry.alt_keycode !== "KC_NO" && entry.alt_keycode !== "";
                        const isDefined = hasKeycode || hasAltKeycode;

                        if (!isDefined) return null;

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex flex-col bg-gray-50 rounded-lg p-2 cursor-pointer hover:bg-gray-100 transition-colors",
                                    !enabled && "opacity-50"
                                )}
                                onClick={() => handleEdit(i)}
                            >
                                <span className="text-[9px] font-bold text-slate-600 mb-1">AR {i}</span>
                                <div className="flex flex-row items-center gap-1">
                                    {renderSmallKey(entry.keycode, i, "keycode", false)}
                                    <ArrowRight className="w-2 h-2 text-gray-400" />
                                    {renderSmallKey(entry.alt_keycode, i, "alt_keycode", false)}
                                </div>
                            </div>
                        );
                    })}
                    {altRepeatKeys.filter(e => (e.keycode !== "KC_NO" && e.keycode !== "") || (e.alt_keycode !== "KC_NO" && e.alt_keycode !== "")).length === 0 && (
                        <div className="text-center text-gray-500 py-2 px-4 text-sm">
                            No alt-repeat keys configured.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <section className="space-y-3 h-full max-h-full flex flex-col pt-3">
            {/* Placeable Alt-Repeat key */}
            <div className="px-3 flex flex-col gap-2">
                <div className="flex">
                    <Key
                        isRelative
                        x={0} y={0} w={1.5} h={1} row={-1} col={-1}
                        keycode="QK_ALT_REPEAT_KEY"
                        label="Alt-Repeat"
                        keyContents={altRepeatKeyContents}
                        layerColor="sidebar"
                        className={cn(
                            "border-kb-gray cursor-pointer",
                            isBinding && `hover:${hoverBorderColor} hover:${hoverBackgroundColor}`
                        )}
                        headerClassName="bg-kb-sidebar-dark"
                        onClick={handleAssignAltRepeatKey}
                    />
                </div>
            </div>

            <div className="px-2 pb-2 text-sm text-muted-foreground">
                Alt-Repeat keys remap what happens when you press Alt-Repeat after a specific key.
                Click on a key slot to assign a keycode.
            </div>

            <div className="flex flex-col overflow-auto flex-grow scrollbar-thin">
                {altRepeatKeys.map((entry, i) => {
                    const enabled = isEnabled(entry.options);
                    const hasKeycode = entry.keycode !== "KC_NO" && entry.keycode !== "";
                    const hasAltKeycode = entry.alt_keycode !== "KC_NO" && entry.alt_keycode !== "";
                    const isDefined = hasKeycode || hasAltKeycode;
                    const isEditing = itemToEdit === i;

                    const rowChildren = (
                        <div className="flex flex-row items-center w-full">
                            <div className="flex flex-row items-center gap-2 ml-4 overflow-hidden">
                                {renderSmallKey(entry.keycode, i, "keycode", isEditing)}
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                {renderSmallKey(entry.alt_keycode, i, "alt_keycode", isEditing)}
                            </div>

                            {isDefined && (
                                <div
                                    className="ml-auto mr-2 flex flex-row items-center gap-0.5 bg-gray-200/50 p-0.5 rounded-md border border-gray-300/50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={(e) => {
                                            if (!enabled) handleToggleEnabled(i, e);
                                        }}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-[3px] transition-all font-bold border",
                                            enabled
                                                ? "bg-black text-white shadow-sm border-black"
                                                : "text-gray-500 border-transparent hover:text-black hover:bg-white hover:shadow-sm"
                                        )}
                                    >
                                        ON
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            if (enabled) handleToggleEnabled(i, e);
                                        }}
                                        className={cn(
                                            "px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-[3px] transition-all font-bold border",
                                            !enabled
                                                ? "bg-black text-white shadow-sm border-black"
                                                : "text-gray-500 border-transparent hover:text-black hover:bg-white hover:shadow-sm"
                                        )}
                                    >
                                        OFF
                                    </button>
                                </div>
                            )}
                        </div>
                    );

                    const keyContents = { type: "altrepeat" } as KeyContent;

                    return (
                        <SidebarItemRow
                            key={i}
                            index={i}
                            keyboard={keyboard}
                            label={i.toString()}
                            keyContents={keyContents}
                            onEdit={handleEdit}
                            hoverBorderColor={hoverBorderColor}
                            hoverBackgroundColor={hoverBackgroundColor}
                            hoverLayerColor={layerColorName}
                            hoverHeaderClass={hoverHeaderClass}
                            showPreviewKey={false}
                            className={cn("py-4", !enabled && isDefined && "opacity-50")}
                        >
                            {rowChildren}
                        </SidebarItemRow>
                    );
                })}

                {altRepeatKeys.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        <p>No alt-repeat keys configured.</p>
                        <p className="text-sm mt-2">This keyboard may not support alt-repeat keys.</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default AltRepeatPanel;
