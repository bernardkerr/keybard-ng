import { FC, useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Keyboard } from "@/components/Keyboard";
import { LayerNameBadge } from "@/components/LayerNameBadge";
import LayersActiveIcon from "@/components/icons/LayersActive";
import LayersDefaultIcon from "@/components/icons/LayersDefault";
import LayersMinusIcon from "@/components/icons/LayersMinusIcon";
import { useVial } from "@/contexts/VialContext";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useChanges } from "@/contexts/ChangesContext";
import { cn } from "@/lib/utils";
import { svalService } from "@/services/sval.service";
import { vialService } from "@/services/vial.service";
import { MATRIX_COLS } from "@/constants/svalboard-layout";
import { KEYMAP } from "@/constants/keygen";
import { usePanels } from "@/contexts/PanelsContext";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface KeyboardViewInstanceProps {
    instanceId: string;
    selectedLayer: number;
    setSelectedLayer: (layer: number) => void;
    isPrimary: boolean;
    showAllLayers: boolean;
    onToggleShowLayers: () => void;
    onRemove?: () => void;
}

/**
 * A self-contained keyboard view instance with its own layer tabs, layer badge, and keyboard.
 * Multiple instances can be stacked vertically, each showing a different layer independently.
 */
const KeyboardViewInstance: FC<KeyboardViewInstanceProps> = ({
    instanceId,
    selectedLayer,
    setSelectedLayer,
    isPrimary,
    showAllLayers,
    onToggleShowLayers,
    onRemove,
}) => {
    const { keyboard, updateKey, setKeyboard } = useVial();
    const { clearSelection } = useKeyBinding();
    const { queue } = useChanges();
    const { activePanel } = usePanels();

    // Ref for container
    const containerRef = useRef<HTMLDivElement>(null);

    if (!keyboard) return null;

    const handleSelectLayer = (layer: number) => () => {
        setSelectedLayer(layer);
        clearSelection();
    };

    const toggleShowLayers = () => {
        onToggleShowLayers();
    };

    // Layer context menu actions
    const handleCopyLayer = () => {
        if (!keyboard?.keymap) return;
        const layerData = keyboard.keymap[selectedLayer];
        navigator.clipboard.writeText(JSON.stringify(layerData));
    };

    const handlePasteLayer = async () => {
        if (!keyboard || !keyboard.keymap) return;
        try {
            const text = await navigator.clipboard.readText();
            const layerData = JSON.parse(text);
            if (Array.isArray(layerData)) {
                if (layerData.length === 0) return;

                const matrixCols = keyboard.cols || MATRIX_COLS;
                const currentLayerKeymap = keyboard.keymap[selectedLayer] || [];
                const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
                if (!updatedKeyboard.keymap[selectedLayer]) {
                    updatedKeyboard.keymap[selectedLayer] = [];
                }

                let hasChanges = false;
                for (let r = 0; r < keyboard.rows; r++) {
                    for (let c = 0; c < keyboard.cols; c++) {
                        const idx = r * matrixCols + c;
                        if (idx < layerData.length) {
                            const newValue = layerData[idx];
                            const currentValue = currentLayerKeymap[idx];
                            if (newValue !== currentValue) {
                                hasChanges = true;
                                updatedKeyboard.keymap[selectedLayer][idx] = newValue;
                                const row = r;
                                const col = c;
                                const previousValue = currentValue;
                                const changeDesc = `key_${selectedLayer}_${row}_${col}`;
                                queue(
                                    changeDesc,
                                    async () => {
                                        updateKey(selectedLayer, row, col, newValue);
                                    },
                                    {
                                        type: "key",
                                        layer: selectedLayer,
                                        row,
                                        col,
                                        keycode: newValue,
                                        previousValue,
                                    }
                                );
                            }
                        }
                    }
                }
                if (hasChanges) {
                    setKeyboard(updatedKeyboard);
                }
            }
        } catch (e) {
            console.error("Failed to paste layer", e);
        }
    };

    const batchWipeKeys = (targetKeycode: number, filterFn: (currentValue: number) => boolean) => {
        if (!keyboard || !keyboard.keymap) return;
        const matrixCols = keyboard.cols || MATRIX_COLS;
        const currentLayerKeymap = keyboard.keymap[selectedLayer] || [];
        const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
        if (!updatedKeyboard.keymap[selectedLayer]) {
            updatedKeyboard.keymap[selectedLayer] = [];
        }
        let hasChanges = false;
        for (let r = 0; r < keyboard.rows; r++) {
            for (let c = 0; c < keyboard.cols; c++) {
                const idx = r * matrixCols + c;
                const currentValue = currentLayerKeymap[idx];
                if (filterFn(currentValue)) {
                    hasChanges = true;
                    updatedKeyboard.keymap[selectedLayer][idx] = targetKeycode;
                    const row = r;
                    const col = c;
                    const previousValue = currentValue;
                    const changeDesc = `key_${selectedLayer}_${row}_${col}`;
                    queue(
                        changeDesc,
                        async () => {
                            updateKey(selectedLayer, row, col, targetKeycode);
                        },
                        {
                            type: "key",
                            layer: selectedLayer,
                            row,
                            col,
                            keycode: targetKeycode,
                            previousValue,
                        }
                    );
                }
            }
        }
        if (hasChanges) {
            setKeyboard(updatedKeyboard);
        }
    };

    const handleWipeDisable = () => {
        const KC_NO = 0;
        batchWipeKeys(KC_NO, (currentValue) => currentValue !== KC_NO);
    };

    const handleWipeTransparent = () => {
        const KC_TRNS = KEYMAP['KC_TRNS']?.code ?? 1;
        batchWipeKeys(KC_TRNS, (currentValue) => currentValue !== KC_TRNS);
    };

    const handleChangeDisabledToTransparent = () => {
        const KC_TRNS = KEYMAP['KC_TRNS']?.code ?? 1;
        const KC_NO = 0;
        batchWipeKeys(KC_TRNS, (currentValue) => currentValue === KC_NO);
    };

    const renderLayerTab = (i: number) => {
        const layerData = keyboard.keymap?.[i];
        const isEmpty = layerData ? vialService.isLayerEmpty(layerData) : true;

        const shouldHideBlank = !showAllLayers;
        if (shouldHideBlank && isEmpty && i !== selectedLayer) {
            return null;
        }

        const layerShortName = svalService.getLayerNameNoLabel(keyboard, i);
        const isActive = selectedLayer === i;

        return (
            <ContextMenu key={`${instanceId}-layer-tab-${i}`}>
                <ContextMenuTrigger asChild>
                    <button
                        onClick={handleSelectLayer(i)}
                        className={cn(
                            "px-4 py-1 rounded-full transition-all text-sm font-medium cursor-pointer border-none outline-none whitespace-nowrap",
                            isActive
                                ? "bg-gray-800 text-white shadow-md scale-105"
                                : "bg-transparent text-gray-600 hover:bg-gray-200"
                        )}
                    >
                        <span className="select-none">{layerShortName}</span>
                    </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                    <ContextMenuItem onSelect={handleCopyLayer}>
                        Copy Layer
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handlePasteLayer}>
                        Paste Layer
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={handleWipeDisable}>
                        Make All Blank
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleWipeTransparent}>
                        Make All Transparent
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleChangeDisabledToTransparent}>
                        Switch Blank to Transparent
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    };

    return (
        <div
            ref={containerRef}
            className="w-full flex-shrink-0"
        >
            {/* Layer Controls Row: Hide-blank-layers toggle + layer tabs + (optional) remove button */}
            <div className="flex items-center gap-2 pl-5 pb-2 whitespace-nowrap">
                <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                        <button
                            onClick={toggleShowLayers}
                            disabled={activePanel === "matrixtester"}
                            className={cn(
                                "p-2 rounded-full transition-colors flex-shrink-0",
                                activePanel === "matrixtester"
                                    ? "text-gray-400 cursor-not-allowed opacity-30"
                                    : "text-black hover:bg-gray-200"
                            )}
                            aria-label={showAllLayers ? "Hide Blank Layers" : "Show All Layers"}
                        >
                            {!showAllLayers ? <LayersActiveIcon className="h-5 w-5" /> : <LayersDefaultIcon className="h-5 w-5" />}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        {showAllLayers ? "Hide Blank Layers" : "Show All Layers"}
                    </TooltipContent>
                </Tooltip>

                {/* Layer tabs */}
                <div className={cn("flex items-center gap-1", activePanel === "matrixtester" && "opacity-30 pointer-events-none")}>
                    {Array.from({ length: keyboard.layers || 16 }, (_, i) => renderLayerTab(i))}
                </div>

                {/* Remove button for non-primary views */}
                {!isPrimary && onRemove && (
                    <Tooltip delayDuration={500}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="p-2 rounded-full transition-colors text-gray-400 hover:text-black hover:bg-gray-200 ml-auto mr-4 flex-shrink-0"
                                aria-label="Hide layer view"
                            >
                                <LayersMinusIcon className="h-5 w-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            Hide layer view
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>

            {/* Layer Name Badge Row */}
            <div className="pl-[27px] pt-[7px] pb-2">
                <LayerNameBadge selectedLayer={selectedLayer} />
            </div>

            {/* Keyboard */}
            <div className="flex items-start justify-center max-w-full">
                <Keyboard
                    keyboard={keyboard}
                    selectedLayer={selectedLayer}
                    setSelectedLayer={setSelectedLayer}
                />
            </div>
        </div>
    );
};

export default KeyboardViewInstance;
