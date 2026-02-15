import { FC, useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Keyboard } from "@/components/Keyboard";
import { LayerNameBadge } from "@/components/LayerNameBadge";
import LayersActiveIcon from "@/components/icons/LayersActive";
import LayersDefaultIcon from "@/components/icons/LayersDefault";
import LayersMinusIcon from "@/components/icons/LayersMinusIcon";
import SquareArrowLeftIcon from "@/components/icons/SquareArrowLeft";
import SquareArrowRightIcon from "@/components/icons/SquareArrowRight";
import { Microscope } from "lucide-react";
import { useVial } from "@/contexts/VialContext";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useChanges } from "@/contexts/ChangesContext";
import { cn } from "@/lib/utils";
import { svalService } from "@/services/sval.service";
import { vialService } from "@/services/vial.service";
import { MATRIX_COLS } from "@/constants/svalboard-layout";
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
    hideLayerTabs?: boolean;
    layerActiveState: boolean[];
    onToggleLayerOn: (layer: number) => void;
    transparencyByLayer: Record<number, boolean>;
    onToggleTransparency: (layer: number, next: boolean) => void;
    showAllLayers: boolean;
    onToggleShowLayers: () => void;
    isLayerOrderReversed: boolean;
    onToggleLayerOrder: () => void;
    onRemove?: () => void;
    onGhostNavigate?: (sourceLayer: number) => void;
    isRevealing?: boolean;
    isHiding?: boolean;
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
    hideLayerTabs = false,
    layerActiveState,
    onToggleLayerOn,
    transparencyByLayer,
    onToggleTransparency,
    showAllLayers,
    onToggleShowLayers,
    isLayerOrderReversed,
    onToggleLayerOrder,
    onRemove,
    onGhostNavigate,
    isRevealing = false,
    isHiding = false,
}) => {
    const { keyboard, updateKey, setKeyboard } = useVial();
    const { clearSelection } = useKeyBinding();
    const { queue } = useChanges();
    const { activePanel } = usePanels();

    const [isTransparencyActive, setIsTransparencyActive] = useState(false);
    const [isHudMode, setIsHudMode] = useState(false);
    const layerOrderClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track transparency per-layer when switching tabs
    useEffect(() => {
        setIsTransparencyActive(!!transparencyByLayer[selectedLayer]);
    }, [selectedLayer, transparencyByLayer]);

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

    const renderLayerTab = (i: number) => {
        const layerData = keyboard.keymap?.[i];
        const isEmpty = layerData ? vialService.isLayerEmpty(layerData) : true;
        const isLayerActive = !!layerActiveState?.[i];

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
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onToggleLayerOn(i);
                        }}
                        className={cn(
                            "px-4 py-1 rounded-full transition-all text-sm font-medium cursor-pointer border-none outline-none whitespace-nowrap",
                            isActive
                                ? "bg-gray-800 text-white shadow-md scale-105"
                                : "bg-transparent text-gray-600 hover:bg-gray-200",
                            isHudMode && !isActive && !isLayerActive && "text-gray-300"
                        )}
                    >
                        <span className={cn("select-none", isLayerActive && "underline underline-offset-2")}>
                            {layerShortName}
                        </span>
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
                    <ContextMenuItem onSelect={() => onToggleLayerOn(i)}>
                        {isLayerActive ? "Turn Layer Off" : "Turn Layer On"}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    };

    return (
        <div
            ref={containerRef}
            className="w-full flex-shrink-0"
            style={{
                opacity: (isRevealing || isHiding) ? 0 : 1,
                transition: 'opacity 200ms ease-in-out',
            }}
        >
            {/* Layer Controls Row: Hide-blank-layers toggle + layer tabs + (optional) remove button */}
            <div className="flex items-center gap-2 pl-5 pb-2 whitespace-nowrap">
                {!hideLayerTabs && (
                    <>
                        <div className="flex items-center gap-1">
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

                        </div>

                        <div className={cn("flex items-center gap-1", activePanel === "matrixtester" && "opacity-30 pointer-events-none")}>
                            {(isLayerOrderReversed
                                ? Array.from({ length: keyboard.layers || 16 }, (_, i) => i).reverse()
                                : Array.from({ length: keyboard.layers || 16 }, (_, i) => i)
                            ).map((i) => renderLayerTab(i))}
                        </div>

                        <Tooltip delayDuration={500}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (layerOrderClickTimer.current) {
                                            clearTimeout(layerOrderClickTimer.current);
                                            layerOrderClickTimer.current = null;
                                        }
                                        if (e.detail >= 2) {
                                            setIsHudMode((prev) => !prev);
                                            return;
                                        }
                                        layerOrderClickTimer.current = setTimeout(() => {
                                            onToggleLayerOrder();
                                            layerOrderClickTimer.current = null;
                                        }, 200);
                                    }}
                                    className={cn(
                                        "p-2 rounded-full transition-colors",
                                        isHudMode
                                            ? "bg-black text-kb-gray"
                                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
                                    )}
                                    aria-label="Reverse Layer Order"
                                >
                                    {isLayerOrderReversed
                                        ? <SquareArrowRightIcon className="h-5 w-5" />
                                        : <SquareArrowLeftIcon className="h-5 w-5" />}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                Flip Layer View
                            </TooltipContent>
                        </Tooltip>
                    </>
                )}





                {/* Remove button for non-primary views */}
                {!isPrimary && onRemove && (
                    <Tooltip delayDuration={500}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="p-2 rounded-full transition-colors text-gray-400 hover:text-black hover:bg-gray-200 ml-auto mr-4 flex-shrink-0"
                                aria-label="Hide layer view"
                                disabled={selectedLayer === 0}
                                data-remove-view={instanceId}
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
            <div className="pl-5 pt-[7px] pb-2 flex items-center gap-2">
                <div style={{ marginLeft: -20 }}>
                    <LayerNameBadge
                        selectedLayer={selectedLayer}
                        isActive={!!layerActiveState?.[selectedLayer]}
                        onToggleLayerOn={onToggleLayerOn}
                        // TODO: when firmware reports default layer, pass it here.
                        defaultLayerIndex={0}
                    />
                </div>

                {/* Transparency Button (reserve space for layer 0 to avoid layout shift) */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => {
                                if (selectedLayer === 0) return;
                                const next = !isTransparencyActive;
                                setIsTransparencyActive(next);
                                onToggleTransparency(selectedLayer, next);
                            }}
                            disabled={activePanel === "matrixtester" || selectedLayer === 0}
                            className={cn(
                                "p-1.5 rounded-full transition-all flex-shrink-0 ml-[-4px]",
                                activePanel === "matrixtester"
                                    ? "text-gray-400 cursor-not-allowed opacity-30"
                                    : isTransparencyActive
                                        ? "bg-black hover:bg-gray-800"
                                        : "hover:bg-gray-200",
                                selectedLayer === 0 && "opacity-0 pointer-events-none"
                            )}
                            aria-label={isTransparencyActive ? "Show Transparent Keys" : "Hide Transparent Keys"}
                        >
                            <Microscope className={cn(
                                "h-4 w-4",
                                isTransparencyActive ? "text-kb-gray" : "text-black"
                            )} />
                        </button>
                    </TooltipTrigger>
                    {selectedLayer !== 0 && (
                        <TooltipContent side="top">
                            {isTransparencyActive ? "Show Transparent Keys" : "Hide Transparent Keys"}
                        </TooltipContent>
                    )}
                </Tooltip>
            </div>

            {/* Keyboard */}
            <div className="flex items-start justify-center max-w-full">
                <Keyboard
                    keyboard={keyboard}
                    selectedLayer={selectedLayer}
                    setSelectedLayer={setSelectedLayer}
                    showTransparency={isTransparencyActive}
                    onGhostNavigate={onGhostNavigate}
                    layerActiveState={layerActiveState}
                />
            </div>
        </div>
    );
};

export default KeyboardViewInstance;
