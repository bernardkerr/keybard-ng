import React, { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";

import SidebarItemRow from "@/layout/SecondarySidebar/components/SidebarItemRow";
import { Input } from "@/components/ui/input";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useLayer } from "@/contexts/LayerContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { qmkService } from "@/services/qmk.service";
import { vialService } from "@/services/vial.service";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { getKeyContents } from "@/utils/keys";
import { Key } from "@/components/Key";
import { KeyContent } from "@/types/vial.types";
import { cn } from "@/lib/utils";

const CombosPanel: React.FC = () => {
    const { keyboard, setKeyboard, isConnected } = useVial();
    const { assignKeycode } = useKeyBinding();
    const { selectedLayer } = useLayer();
    const { layoutMode } = useLayoutSettings();
    const {
        setItemToEdit,
        setBindingTypeToEdit,
        setAlternativeHeader,
    } = usePanels();
    const [saving, setSaving] = useState(false);

    const isHorizontal = layoutMode === "bottombar";

    if (!keyboard) return null;

    // QSID 2 = Combo timeout
    const COMBO_TIMEOUT_QSID = 2;
    const isTimeoutSupported = keyboard.settings?.[COMBO_TIMEOUT_QSID] !== undefined;
    const comboTimeout = keyboard.settings?.[COMBO_TIMEOUT_QSID] ?? 50;

    const handleTimeoutChange = async (value: number) => {
        if (!isConnected) return;
        setSaving(true);
        try {
            const clamped = Math.max(0, Math.min(10000, value));
            const updated = {
                ...keyboard,
                settings: { ...keyboard.settings, [COMBO_TIMEOUT_QSID]: clamped }
            };
            setKeyboard(updated);
            await qmkService.push(updated, COMBO_TIMEOUT_QSID);
            await vialService.saveViable();
        } catch (err) {
            console.error("Failed to update combo timeout:", err);
        } finally {
            setSaving(false);
        }
    };

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses["primary"];

    const combos = keyboard.combos || [];

    const handleEdit = (index: number) => {
        setItemToEdit(index);
        setBindingTypeToEdit("combos");
        setAlternativeHeader(true);
    };

    const isKeyAssigned = (content: KeyContent | undefined) => {
        if (!content) return false;
        const top = content.top;
        const str = content.str;
        return (top && top !== "KC_NO" && top !== "TRNS") || (str && str !== "KC_NO" && str !== "");
    };

    const renderSmallKey = (content: KeyContent, idx: number, comboIndex: number) => {
        const hasContent = isKeyAssigned(content);
        return (
            <div key={idx} className="relative w-[30px] h-[30px]">
                <Key
                    isRelative
                    x={0} y={0} w={1} h={1} row={-1} col={-1}
                    keycode={content?.top || "KC_NO"}
                    label={content?.str || ""}
                    keyContents={content}
                    layerColor={hasContent ? "sidebar" : undefined}
                    className={hasContent ? "border-kb-gray" : "bg-transparent border border-kb-gray-border"}
                    headerClassName={hasContent ? "bg-kb-sidebar-dark" : "text-black"}
                    variant="small"
                    onClick={() => handleEdit(comboIndex)}
                />
            </div>
        );
    };

    // Horizontal grid layout for bottom panel
    if (isHorizontal) {
        return (
            <div className="flex flex-row gap-3 h-full items-start pt-2">
                {combos.map((comboEntry, i) => {
                    const combo = comboEntry as any as import("@/types/vial.types").ComboEntry;

                    const inputs = [0, 1, 2, 3].map(idx => ({
                        content: getKeyContents(keyboard, combo.keys[idx] || "KC_NO") as KeyContent,
                        id: idx
                    })).filter(k => isKeyAssigned(k.content));

                    const resultKeycode = combo.output;
                    const result = getKeyContents(keyboard, resultKeycode || "KC_NO") as KeyContent;
                    const hasAssignment = inputs.length > 0 || isKeyAssigned(result);

                    if (!hasAssignment) return null;

                    return (
                        <div
                            key={i}
                            className="flex flex-col bg-gray-50 rounded-lg p-2 cursor-pointer hover:bg-gray-100 transition-colors min-w-[100px]"
                            onClick={() => handleEdit(i)}
                        >
                            <span className="text-xs font-bold text-center mb-1 text-slate-600">Combo {i}</span>
                            <div className="flex flex-row items-center justify-center gap-1 flex-wrap">
                                {inputs.map((input, idx) => (
                                    <React.Fragment key={input.id}>
                                        {idx > 0 && <Plus className="w-2 h-2 text-gray-400" />}
                                        {renderSmallKey(input.content, input.id, i)}
                                    </React.Fragment>
                                ))}
                                <ArrowRight className="w-3 h-3 text-gray-400 mx-1" />
                                {renderSmallKey(result, 4, i)}
                            </div>
                        </div>
                    );
                })}
                {combos.filter(combo => {
                    const c = combo as any;
                    const inputs = [0, 1, 2, 3].map(idx => c.keys?.[idx]).filter(k => k && k !== "KC_NO");
                    return inputs.length > 0 || (c.output && c.output !== "KC_NO");
                }).length === 0 && (
                    <div className="text-center text-gray-500 py-4 px-6">
                        No combos configured.
                    </div>
                )}
            </div>
        );
    }

    // Vertical list layout for sidebar (original)
    return (
        <section className="space-y-3 h-full max-h-full flex flex-col pt-3">
            {/* Combo Timeout Setting */}
            {isTimeoutSupported && isConnected && (
                <div className="px-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">Combo Timeout</span>
                            <span className="text-xs text-muted-foreground">0-10000 ms</span>
                        </div>
                        <Input
                            type="number"
                            value={comboTimeout}
                            min={0}
                            max={10000}
                            onChange={(e) => {
                                const newVal = parseInt(e.target.value) || 0;
                                handleTimeoutChange(newVal);
                            }}
                            disabled={saving}
                            className={cn("w-24 text-right", saving && "opacity-50")}
                        />
                    </div>
                </div>
            )}

            {/* Scrollable Combos List */}
            <div className="flex flex-col overflow-auto flex-grow scrollbar-thin">
                {combos.map((comboEntry, i) => {
                    const combo = comboEntry as any as import("@/types/vial.types").ComboEntry;

                    const inputs = [0, 1, 2, 3].map(idx => ({
                        content: getKeyContents(keyboard, combo.keys[idx] || "KC_NO") as KeyContent,
                        id: idx
                    })).filter(k => isKeyAssigned(k.content));

                    const resultKeycode = combo.output;
                    const result = getKeyContents(keyboard, resultKeycode || "KC_NO") as KeyContent;
                    const hasAssignment = inputs.length > 0 || isKeyAssigned(result);

                    const rowChildren = hasAssignment ? (
                        <div className="flex flex-row items-center gap-1 ml-4 overflow-hidden">
                            {inputs.map((input, idx) => (
                                <React.Fragment key={input.id}>
                                    {idx > 0 && <Plus className="w-3 h-3 text-black" />}
                                    {renderSmallKey(input.content, input.id, i)}
                                </React.Fragment>
                            ))}
                            <ArrowRight className="w-3 h-3 text-black mx-1" />
                            {renderSmallKey(result, 4, i)}
                        </div>
                    ) : undefined;

                    const keyContents = { type: "combo" } as KeyContent;

                    return (
                        <SidebarItemRow
                            key={i}
                            index={i}
                            keyboard={keyboard}
                            label={i.toString()}
                            keycode={resultKeycode || "KC_NO"}
                            keyContents={keyContents}
                            onEdit={handleEdit}
                            onAssignKeycode={assignKeycode}
                            hoverBorderColor={hoverBorderColor}
                            hoverBackgroundColor={hoverBackgroundColor}
                            hoverLayerColor={layerColorName}
                            hoverHeaderClass={hoverHeaderClass}
                            showPreviewKey={false}
                            className="py-4"
                        >
                            {rowChildren}
                        </SidebarItemRow>
                    );
                })}

                {combos.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        No combos found.
                    </div>
                )}
            </div>
        </section>
    );
};

export default CombosPanel;
