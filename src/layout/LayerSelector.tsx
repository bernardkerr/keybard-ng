import LayersActiveIcon from "@/components/icons/LayersActive";
import LayersDefaultIcon from "@/components/icons/LayersDefault";
import { LayoutImport } from "@/components/icons/LayoutImport";
import { LayoutExport } from "@/components/icons/LayoutExport";
import MatrixTesterIcon from "@/components/icons/MatrixTesterSvg";
import { LayerNameBadge } from "@/components/LayerNameBadge";
import { ArrowLeft, ChevronDown, Unplug, Undo2, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { useVial } from "@/contexts/VialContext";
import { useChanges } from "@/contexts/ChangesContext";
import { useSettings } from "@/contexts/SettingsContext";
import { MATRIX_COLS } from "@/constants/svalboard-layout";
import { cn } from "@/lib/utils";
// import { activeBackgroundClasses, activeTextClasses } from "@/utils/colors";
import { svalService } from "@/services/sval.service";
import { fileService } from "@/services/file.service";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

import { vialService } from "@/services/vial.service";
import { FC, useState, useEffect, useRef } from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { KEYMAP } from "@/constants/keygen";
import { usePanels } from "@/contexts/PanelsContext";


interface LayerSelectorProps {
    selectedLayer: number;
    setSelectedLayer: (layer: number) => void;
}

/**
 * Component for selecting and managing active layers in the keyboard editor.
 * Displays a horizontal bar of layer tabs with a filter toggle for hiding blank layers.
 */
const LayerSelector: FC<LayerSelectorProps> = ({ selectedLayer, setSelectedLayer }) => {
    const { keyboard, setKeyboard, updateKey, isConnected, connect, resetToOriginal } = useVial();
    const { clearSelection } = useKeyBinding();
    const { queue, commit, getPendingCount, clearAll } = useChanges();
    const { getSetting, updateSetting } = useSettings();

    const liveUpdating = getSetting("live-updating") === true;



    // Import/Export / Connect state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<"viable" | "vil">("viable");
    const [includeMacros, setIncludeMacros] = useState(true);

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const newKbInfo = await fileService.uploadFile(file);
                if (newKbInfo) {
                    // Start sync if connected
                    if (keyboard && isConnected) {
                        const { importService } = await import('@/services/import.service');
                        const { vialService } = await import('@/services/vial.service');

                        await importService.syncWithKeyboard(
                            newKbInfo,
                            keyboard,
                            queue,
                            { vialService }
                        );

                        // Merge fragment definitions and state from connected keyboard
                        if (keyboard.fragments) {
                            newKbInfo.fragments = keyboard.fragments;
                        }
                        if (keyboard.composition) {
                            newKbInfo.composition = keyboard.composition;
                        }
                        // Merge hardware detection/EEPROM from connected keyboard with user selections from file
                        const ensureMap = <K, V>(obj: Map<K, V> | Record<string, V> | undefined): Map<K, V> => {
                            if (!obj) return new Map();
                            if (obj instanceof Map) return obj;
                            return new Map(Object.entries(obj)) as unknown as Map<K, V>;
                        };

                        if (keyboard.fragmentState) {
                            const importedUserSelections = ensureMap<string, string>(newKbInfo.fragmentState?.userSelections);
                            newKbInfo.fragmentState = {
                                hwDetection: ensureMap<number, number>(keyboard.fragmentState.hwDetection),
                                eepromSelections: ensureMap<number, number>(keyboard.fragmentState.eepromSelections),
                                userSelections: importedUserSelections,
                            };
                        }

                        // Recompose layout with fragment selections
                        const fragmentComposer = vialService.getFragmentComposer();
                        if (fragmentComposer.hasFragments(newKbInfo)) {
                            const composedLayout = fragmentComposer.composeLayout(newKbInfo);
                            if (Object.keys(composedLayout).length > 0) {
                                newKbInfo.keylayout = composedLayout;
                                console.log("Fragment layout recomposed after import:", Object.keys(composedLayout).length, "keys");
                            }
                        }
                    }

                    setKeyboard(newKbInfo);
                    console.log("Import successful", newKbInfo);
                }
            } catch (err) {
                console.error("Upload failed", err);
            }
        }
        // Reset input so same file can be selected again
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleExport = async () => {
        if (!keyboard) {
            console.error("No keyboard loaded");
            return;
        }

        try {
            if (exportFormat === "viable") {
                await fileService.downloadViable(keyboard, includeMacros);
            } else {
                await fileService.downloadVIL(keyboard, includeMacros);
            }
            setIsExportOpen(false);
        } catch (err) {
            console.error("Export failed", err);
        }
    };

    // User preference for showing all layers
    const [showAllLayers, setShowAllLayers] = useState(true);

    // Track container width for auto-hiding blank layers when narrow
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    const [windowHeight, setWindowHeight] = useState(window.innerHeight);
    const [isHovered, setIsHovered] = useState(false);
    const [ignoreHover, setIgnoreHover] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Track window height for hover-only mode
    useEffect(() => {
        const handleResize = () => setWindowHeight(window.innerHeight);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // When narrow: force-hide blank layers (override user toggle)
    // When wide: respect user's showAllLayers toggle
    // Threshold of 800px accounts for sidebar + layer tabs needing room
    const isNarrow = containerWidth > 0 && containerWidth < 800;

    // When vertically constrained, go into hover-only mode
    // Threshold of 550px is when keyboard + layer bar start competing for space
    const isVerticallyConstrained = windowHeight < 550;
    const showFullBar = !isVerticallyConstrained || isHovered;

    if (!keyboard) return null;

    const handleSelectLayer = (layer: number) => () => {
        setSelectedLayer(layer);
        clearSelection();
    };

    const toggleShowLayers = () => {
        setShowAllLayers((prev) => !prev);
    };

    // Layer Actions



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

                // Clone keyboard once for all changes
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

                            // Only queue change if value is different
                            if (newValue !== currentValue) {
                                hasChanges = true;

                                // Update the cloned keyboard
                                updatedKeyboard.keymap[selectedLayer][idx] = newValue;

                                // Queue change for tracking
                                const row = r;
                                const col = c;
                                const previousValue = currentValue;
                                const changeDesc = `key_${selectedLayer}_${row}_${col}`;

                                queue(
                                    changeDesc,
                                    async () => {
                                        console.log(`Committing key change: Layer ${selectedLayer}, Key [${row},${col}] → ${newValue}`);
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

                // Only update state if there were changes
                if (hasChanges) {
                    setKeyboard(updatedKeyboard);
                }
            }
        } catch (e) {
            console.error("Failed to paste layer", e);
        }
    };

    // Batch wipe helper - clones keyboard once, makes all changes, queues each for tracking, then updates state once
    const batchWipeKeys = (targetKeycode: number, filterFn: (currentValue: number) => boolean) => {
        if (!keyboard || !keyboard.keymap) return;

        const matrixCols = keyboard.cols || MATRIX_COLS;
        const currentLayerKeymap = keyboard.keymap[selectedLayer] || [];

        // Clone keyboard once for all changes
        const updatedKeyboard = JSON.parse(JSON.stringify(keyboard));
        if (!updatedKeyboard.keymap[selectedLayer]) {
            updatedKeyboard.keymap[selectedLayer] = [];
        }

        // Track if any changes were made
        let hasChanges = false;

        for (let r = 0; r < keyboard.rows; r++) {
            for (let c = 0; c < keyboard.cols; c++) {
                const idx = r * matrixCols + c;
                const currentValue = currentLayerKeymap[idx];

                // Only process keys that pass the filter
                if (filterFn(currentValue)) {
                    hasChanges = true;

                    // Update the cloned keyboard
                    updatedKeyboard.keymap[selectedLayer][idx] = targetKeycode;

                    // Queue change for tracking (captures row, col, targetKeycode by value)
                    const row = r;
                    const col = c;
                    const previousValue = currentValue;
                    const changeDesc = `key_${selectedLayer}_${row}_${col}`;

                    queue(
                        changeDesc,
                        async () => {
                            console.log(`Committing key change: Layer ${selectedLayer}, Key [${row},${col}] → ${targetKeycode}`);
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

        // Only update state if there were changes
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

    const { activePanel, setActivePanel, setOpen, setItemToEdit, setPanelToGoBack } = usePanels();

    // Render a layer tab with context menu for right-click actions
    const renderLayerTab = (i: number) => {
        const layerData = keyboard.keymap?.[i];
        const isEmpty = layerData ? vialService.isLayerEmpty(layerData) : true;

        // When narrow: always hide blank layers (except selected)
        // When wide: respect user's showAllLayers preference
        const shouldHideBlank = isNarrow || !showAllLayers;
        if (shouldHideBlank && isEmpty && i !== selectedLayer) {
            return null;
        }

        const layerShortName = svalService.getLayerNameNoLabel(keyboard, i);
        const isActive = selectedLayer === i;

        return (
            <ContextMenu key={`layer-tab-${i}`}>
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

    // Single clean render - horizontal bar of layer tabs (single line, no wrap, no scroll)
    // When vertically constrained: hover-only mode with collapsed hint bar
    return (
        <div
            ref={containerRef}
            className={cn(
                "w-full flex-shrink-0 relative z-20 transition-all duration-200",
                showFullBar ? "pt-[22px]" : "pt-0"
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Collapsed hint bar - shown when vertically constrained and not hovered */}
            {isVerticallyConstrained && !isHovered && (
                <div className="flex items-center justify-center text-gray-300 cursor-pointer h-3">
                    <ChevronDown className="h-3 w-3" />
                </div>
            )}

            {/* Full layer tabs - shown when not constrained or when hovered */}
            {showFullBar && (
                <div className="flex flex-col w-full">
                    {/* Top Row: Connect/Import/Export + Live Controls + Tab Icon + Tabs */}
                    <div className="flex items-center gap-2 pl-5 py-2 whitespace-nowrap">

                        {/* File Input (Hidden) */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".viable,.vil,.json"
                            className="hidden"
                            onChange={handleFileImport}
                        />

                        {/* Export Dialog */}
                        <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Export Keyboard Configuration</DialogTitle>
                                    <DialogDescription>
                                        Choose the format and options for exporting your keyboard configuration.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="format" className="text-right">Format</Label>
                                        <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "viable" | "vil")}>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select format" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="viable">.viable (Recommended)</SelectItem>
                                                <SelectItem value="vil">.vil (Vial compatible)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="macros" className="text-right">Include Macros</Label>
                                        <Switch
                                            id="macros"
                                            checked={includeMacros}
                                            onCheckedChange={setIncludeMacros}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsExportOpen(false)}>Cancel</Button>
                                    <Button onClick={handleExport}>Export</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Connect / Update Button Group */}
                        {!isConnected ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); connect(); }}
                                className="flex items-center gap-2 text-sm font-medium cursor-pointer transition-all bg-black text-gray-200 hover:bg-gray-800 px-5 py-1.5 rounded-full mr-2"
                                title="Click to Connect"
                            >
                                <Unplug className="h-4 w-4 text-gray-200" />
                                <span className="select-none">Connect</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-1">

                                {/* Mode Switch Button (Zap) - Only show when NOT live updating (to switch TO live) */}
                                {!liveUpdating && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    commit();
                                                    updateSetting("live-updating", true);
                                                }}
                                                className="p-2 rounded-full transition-all cursor-pointer hover:bg-gray-100"
                                                aria-label="Switch to Live Updating"
                                            >
                                                <Zap className="h-4 w-4 fill-black text-black" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            Switch to Live Updating
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                {/* Main Action Button */}
                                {liveUpdating ? (
                                    <>
                                        {/* Zap button to switch to Manual/Update Now mode - inverted colors */}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateSetting("live-updating", false);
                                                    }}
                                                    className="p-2 rounded-full transition-all cursor-pointer bg-black hover:bg-gray-800"
                                                    aria-label="Switch to Manual Updates"
                                                >
                                                    <Zap className="h-4 w-4 fill-kb-gray text-kb-gray" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                Switch to Manual Updates
                                            </TooltipContent>
                                        </Tooltip>
                                        {/* Live Updating button - black text on transparent background */}
                                        <button
                                            disabled={true}
                                            className="flex items-center text-sm font-medium pl-2 pr-5 py-1.5 rounded-full bg-transparent text-black border border-transparent cursor-default"
                                        >
                                            <span className="select-none">Live Updating</span>
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIgnoreHover(true);
                                            // Handle "Update Changes"
                                            commit();
                                        }}
                                        onMouseLeave={() => setIgnoreHover(false)}
                                        disabled={getPendingCount() === 0}
                                        className={cn(
                                            "flex items-center gap-2 text-sm font-medium transition-all px-5 py-1.5 rounded-full border",
                                            // Disabled state
                                            getPendingCount() === 0
                                                ? "bg-gray-200 text-black border-gray-200 cursor-not-allowed"
                                                : "bg-black text-gray-200 cursor-pointer",
                                            // Hover logic - Manual Mode: Red (only when enabled)
                                            getPendingCount() > 0 && (!ignoreHover) && "hover:bg-red-500 hover:text-white hover:border-red-500",

                                            // Pending Changes Ring (Manual Mode only)
                                            getPendingCount() > 0
                                                ? `border-transparent ring-[3px] ring-red-500 ring-offset-2 ring-offset-kb-gray ${!ignoreHover ? "hover:ring-black" : ""}`
                                                : "", // No ring when disabled

                                            // Active state (click) - only when enabled
                                            getPendingCount() > 0 && "active:bg-red-500 active:text-white"
                                        )}
                                    >
                                        <span className="select-none">
                                            {getPendingCount() > 0
                                                ? `Update ${getPendingCount()} Change${getPendingCount() === 1 ? '' : 's'}`
                                                : 'Update Changes'}
                                        </span>
                                    </button>
                                )}

                                {!liveUpdating && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (getPendingCount() > 0) {
                                                        clearAll();
                                                        resetToOriginal();
                                                    }
                                                }}
                                                disabled={getPendingCount() === 0}
                                                className={cn(
                                                    "p-2 rounded-full transition-all text-black ml-0",
                                                    getPendingCount() > 0 ? "cursor-pointer hover:bg-gray-100" : "opacity-30 cursor-not-allowed"
                                                )}
                                            >
                                                <Undo2 className="h-4 w-4" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                            Revert
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                        )}

                        {/* Divider */}
                        <div className="h-4 w-[1px] bg-slate-400 mx-0 flex-shrink-0" />

                        {/* Matrix Tester Button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (activePanel === "matrixtester") {
                                            // If already in matrix tester mode, exit it
                                            setActivePanel(null);
                                        } else {
                                            // Enter matrix tester mode
                                            setOpen(false);
                                            setActivePanel("matrixtester");
                                            setPanelToGoBack(null);
                                            setItemToEdit(null);
                                        }
                                    }}
                                    className={cn(
                                        "p-2 rounded-full transition-all cursor-pointer mr-2",
                                        activePanel === "matrixtester"
                                            ? "bg-black hover:bg-gray-800"
                                            : "hover:bg-gray-100"
                                    )}
                                    aria-label={activePanel === "matrixtester" ? "Exit Matrix Tester" : "Matrix Tester"}
                                >
                                    <MatrixTesterIcon className={cn(
                                        "h-5 w-5",
                                        activePanel === "matrixtester" ? "text-kb-gray" : "text-black"
                                    )} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {activePanel === "matrixtester" ? "Exit Matrix Tester" : "Matrix Tester"}
                            </TooltipContent>
                        </Tooltip>

                        {/* Import Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            className="group flex items-center text-sm font-medium cursor-pointer transition-opacity opacity-100 mr-2"
                        >
                            <LayoutImport className="h-5 w-5 text-black" />
                            <span className="max-w-0 opacity-0 group-hover:max-w-[60px] group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 overflow-hidden whitespace-nowrap">
                                Import
                            </span>
                        </button>

                        {/* Export Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExportOpen(true); }}
                            className="group flex items-center text-sm font-medium cursor-pointer transition-opacity opacity-100"
                            disabled={!keyboard}
                        >
                            <LayoutExport className="h-5 w-5 text-black" />
                            <span className="max-w-0 opacity-0 group-hover:max-w-[60px] group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 overflow-hidden whitespace-nowrap">
                                Export
                            </span>
                        </button>

                        {/* Divider */}
                        <div className="h-4 w-[1px] bg-slate-400 mx-2 flex-shrink-0" />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={toggleShowLayers}
                                    disabled={isNarrow || activePanel === "matrixtester"}
                                    className={cn(
                                        "p-1.5 rounded-md transition-colors flex-shrink-0",
                                        (isNarrow || activePanel === "matrixtester")
                                            ? "text-gray-400 cursor-not-allowed opacity-30"
                                            : "text-black hover:bg-gray-200"
                                    )}
                                    aria-label={isNarrow ? "Blank layers auto-hidden" : (showAllLayers ? "Hide Blank Layers" : "Show All Layers")}
                                >
                                    {(isNarrow || !showAllLayers) ? <LayersActiveIcon className="h-5 w-5" /> : <LayersDefaultIcon className="h-5 w-5" />}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {isNarrow ? "Blank layers auto-hidden (narrow)" : (showAllLayers ? "Hide Blank Layers" : "Show All Layers")}
                            </TooltipContent>
                        </Tooltip>

                        {/* Layer tabs - single line */}
                        <div className={cn("flex items-center gap-1", activePanel === "matrixtester" && "opacity-30 pointer-events-none")}>
                            {Array.from({ length: keyboard.layers || 16 }, (_, i) => renderLayerTab(i))}
                        </div>
                    </div>

                    {/* Bottom Row: Layer Name Badge or Matrix Tester Title */}
                    <div className="pl-[27px] pt-[7px] pb-2">
                        {activePanel === "matrixtester" ? (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setActivePanel(null)}
                                    className="flex items-center gap-2 p-1 pr-3 -ml-1 rounded-lg hover:bg-gray-200 transition-colors"
                                    title="Return to layer view"
                                >
                                    <ArrowLeft className="h-5 w-5 text-black" />
                                    <span className="font-bold text-lg text-black">Matrix Tester</span>
                                </button>
                            </div>
                        ) : (
                            <LayerNameBadge selectedLayer={selectedLayer} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LayerSelector;
