import "./Keyboard.css";
import { cn } from "@/lib/utils";

import { getKeyLabel, getKeycodeName } from "@/utils/layers";
import React, { useMemo, useEffect, useRef } from "react";
import { MATRIX_COLS, SVALBOARD_LAYOUT, UNIT_SIZE } from "../constants/svalboard-layout";
import { THUMB_OFFSET_U } from "../constants/keyboard-visuals";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import type { KeyboardInfo } from "../types/vial.types";
import { Key } from "./Key";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { getLabelForKeycode } from "./Keyboards/layouts";
import {
    headerClasses,
    hoverHeaderClasses,
    hoverBackgroundClasses,
    hoverBorderClasses,
    colorClasses,
    layerColors
} from "@/utils/colors";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { svalService } from "@/services/sval.service";
// import { InfoIcon } from "./icons/InfoIcon";
import { usePanels } from "@/contexts/PanelsContext";
import { useChanges } from "@/hooks/useChanges";

interface KeyboardProps {
    keyboard: KeyboardInfo;
    onKeyClick?: (layer: number, row: number, col: number) => void;
    selectedLayer: number;
    setSelectedLayer: (layer: number) => void;
    showTransparency?: boolean;
    onGhostNavigate?: (sourceLayer: number) => void;
    layerOnState?: boolean[];
}

/**
 * Main Keyboard component for the Svalboard layout.
 * Renders individual keys, cluster backgrounds, and an information panel.
 */
export const Keyboard: React.FC<KeyboardProps> = ({
    keyboard,
    selectedLayer,
    setSelectedLayer,
    showTransparency = false,
    onGhostNavigate,
    layerOnState,
}) => {
    const {
        selectKeyboardKey,
        selectedTarget,
        clearSelection,
        assignKeycode
    } = useKeyBinding();

    const { activePanel, itemToEdit } = usePanels();
    const { hasPendingChangeForKey } = useChanges();

    // Use dynamic keylayout from fragments if available, otherwise fallback to hardcoded layout
    const { keyboardLayout, useFragmentLayout } = useMemo(() => {
        // Priority 1: Use composed keylayout if available (from fragment composition)
        if (keyboard.keylayout && Object.keys(keyboard.keylayout).length > 0) {
            return {
                keyboardLayout: keyboard.keylayout as Record<number, { x: number; y: number; w: number; h: number; row?: number; col?: number }>,
                useFragmentLayout: true,
            };
        }
        // Priority 2: Fallback to hardcoded layout for backward compatibility
        return {
            keyboardLayout: SVALBOARD_LAYOUT,
            useFragmentLayout: false,
        };
    }, [keyboard.keylayout]);

    // Use keyboard's cols if available, otherwise fallback to constant
    const matrixCols = keyboard.cols || MATRIX_COLS;

    const { internationalLayout, keyVariant, fingerClusterSqueeze } = useLayoutSettings();
    const isTransmitting = useMemo(() =>
        itemToEdit !== null && ["tapdances", "combos", "macros", "overrides"].includes(activePanel || ""),
        [itemToEdit, activePanel]
    );

    const currentUnitSize = useMemo(() =>
        keyVariant === 'small' ? 30 : keyVariant === 'medium' ? 45 : UNIT_SIZE,
        [keyVariant]
    );

    // Calculate layout midline for squeeze positioning (center X of the keyboard)
    const layoutMidline = useMemo(() => {
        let maxX = 0;
        Object.values(keyboardLayout).forEach((key) => {
            maxX = Math.max(maxX, key.x + key.w);
        });
        return maxX / 2;
    }, [keyboardLayout]);

    // Ref to store the selection before entering transmitting mode
    const savedSelection = useRef<{ layer: number; row: number; col: number } | null>(null);

    useEffect(() => {
        if (isTransmitting) {
            if (selectedTarget?.type === "keyboard" && typeof selectedTarget.row === "number" && typeof selectedTarget.col === "number") {
                savedSelection.current = {
                    layer: selectedTarget.layer ?? selectedLayer,
                    row: selectedTarget.row,
                    col: selectedTarget.col,
                };
                clearSelection();
            }
        } else if (savedSelection.current) {
            const { layer, row, col } = savedSelection.current;
            selectKeyboardKey(layer, row, col);
            savedSelection.current = null;
        }
    }, [isTransmitting, selectedTarget, selectedLayer, clearSelection, selectKeyboardKey]);

    const layerColor = useMemo(() =>
        keyboard.cosmetic?.layer_colors?.[selectedLayer] || "primary",
        [keyboard.cosmetic, selectedLayer]
    );

    const layerKeymap = useMemo(() =>
        keyboard.keymap?.[selectedLayer] || [],
        [keyboard.keymap, selectedLayer]
    );

    const isKeySelected = (row: number, col: number) => {
        return selectedTarget?.type === "keyboard" &&
            selectedTarget.layer === selectedLayer &&
            selectedTarget.row === row &&
            selectedTarget.col === col;
    };

    const handleKeyClick = (row: number, col: number) => {
        if (isTransmitting) {
            const pos = row * matrixCols + col;
            const keycode = layerKeymap[pos] || 0;
            const keycodeName = getKeycodeName(keycode);
            assignKeycode(keycodeName);
            return;
        }

        if (isKeySelected(row, col)) {
            clearSelection();
            return;
        }
        selectKeyboardKey(selectedLayer, row, col);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === "Delete" || e.key === "Backspace") && selectedTarget?.type === "keyboard") {
                if (selectedTarget.layer === selectedLayer && typeof selectedTarget.row === 'number') {
                    assignKeycode("KC_NO");
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedTarget, selectedLayer, assignKeycode]);

    const keyboardSize = useMemo(() => {
        let maxX = 0;
        let maxY = 0;
        let minY = Infinity; // Top edge of keyboard

        Object.values(keyboardLayout).forEach((key) => {
            // Only apply THUMB_OFFSET_U for hardcoded layout, not fragment-composed layouts
            const yPos = (!useFragmentLayout && key.y >= 6) ? key.y + THUMB_OFFSET_U : key.y;
            maxX = Math.max(maxX, key.x + key.w);
            maxY = Math.max(maxY, yPos + key.h);
            minY = Math.min(minY, yPos);
        });

        // Adjust width for squeeze (both sides squeezed toward center)
        const adjustedMaxX = maxX - (2 * fingerClusterSqueeze);

        // Badge position: horizontally centered, aligned with top keys (same Y level)
        const badgeCenterX = (adjustedMaxX / 2) * currentUnitSize;
        // Position at the same Y level as the top keys (center of the top row)
        const badgeCenterY = (minY + 0.5) * currentUnitSize;

        return {
            width: adjustedMaxX * currentUnitSize,
            height: maxY * currentUnitSize + 20,
            badgeCenterX,
            badgeCenterY,
        };
    }, [keyboardLayout, currentUnitSize, useFragmentLayout, fingerClusterSqueeze]);

    const KC_TRNS = 1;

    // Helper to find effective keycode for transparency
    // Uses layerOnState (UI/device) to decide which lower layers are "active".
    // Fallback is always Layer 0.
    const findEffectiveKey = (startLayer: number, pos: number) => {
        for (let l = startLayer - 1; l >= 0; l--) {
            const isOn = layerOnState ? !!layerOnState[l] : false;
            if (!isOn) continue;
            const keymap = keyboard.keymap?.[l];
            if (!keymap) continue;
            const code = keymap[pos];
            if (code !== KC_TRNS) {
                return {
                    keycode: code,
                    sourceLayer: l,
                    sourceLayerColor: keyboard.cosmetic?.layer_colors?.[l] || "primary"
                };
            }
        }

        // Fallback to layer 0 key
        const baseLayer = 0;
        const keymap = keyboard.keymap?.[baseLayer];
        if (!keymap) return null;
        const code = keymap[pos];
        return {
            keycode: code,
            sourceLayer: baseLayer,
            sourceLayerColor: keyboard.cosmetic?.layer_colors?.[baseLayer] || "primary"
        };
    };

    return (
        <div className="p-4">
            <div
                className="keyboard-layout relative"
                style={{ width: `${keyboardSize.width}px`, height: `${keyboardSize.height}px` }}
            >
                {/* Keys */}
                {Object.entries(keyboardLayout).map(([matrixPos, layout]) => {
                    const pos = Number(matrixPos);
                    // Use row/col from layout if available (from fragments), otherwise calculate from position
                    const row = typeof layout.row === 'number' ? layout.row : Math.floor(pos / matrixCols);
                    const col = typeof layout.col === 'number' ? layout.col : pos % matrixCols;

                    let keycode = layerKeymap[pos] || 0;

                    // Transparency Logic
                    let effectiveKeycode = 0;
                    let effectiveLayerColor = "primary";
                    let isGhostKey = false;
                    let ghostSourceLayer = -1;

                    if (showTransparency && keycode === KC_TRNS && selectedLayer > 0) {
                        const effective = findEffectiveKey(selectedLayer, pos);
                        if (effective) {
                            effectiveKeycode = effective.keycode;
                            effectiveLayerColor = effective.sourceLayerColor;
                            isGhostKey = true;
                            ghostSourceLayer = effective.sourceLayer;
                        }
                    }

                    // Render Standard Key (or the underlying key if ghost is active)
                    const { label: defaultLabel, keyContents } = getKeyLabel(keyboard, keycode);
                    const keycodeName = getKeycodeName(keycode);
                    const label = getLabelForKeycode(keycodeName, internationalLayout) || defaultLabel;

                    // Styles for transmitting mode
                    const activeLayerColor = isTransmitting ? "sidebar" : layerColor;
                    const headerClass = headerClasses[activeLayerColor] || headerClasses["primary"];
                    const hoverHeaderClass = hoverHeaderClasses[activeLayerColor] || hoverHeaderClasses["primary"];
                    const keyHeaderClassFull = `${headerClass} ${hoverHeaderClass}`;

                    const keyHoverBg = isTransmitting ? hoverBackgroundClasses[layerColor] : undefined;
                    const keyHoverBorder = isTransmitting ? hoverBorderClasses[layerColor] : undefined;
                    const keyHoverLayerColor = isTransmitting ? layerColor : undefined;

                    // Only apply THUMB_OFFSET_U for hardcoded layout, not fragment-composed layouts
                    const yPos = (!useFragmentLayout && layout.y >= 6) ? layout.y + THUMB_OFFSET_U : layout.y;

                    // Apply finger cluster squeeze: shift keys toward center based on side
                    // Only squeeze finger cluster keys (y < 5), not thumb clusters (y >= 5)
                    let xPos = layout.x;
                    const isThumbCluster = layout.y >= 5;
                    if (fingerClusterSqueeze > 0) {
                        if (!isThumbCluster) {
                            const keyCenterX = layout.x + layout.w / 2;
                            if (keyCenterX < layoutMidline) {
                                // Left side: shift right (toward center)
                                xPos = layout.x + fingerClusterSqueeze;
                            } else {
                                // Right side: shift left (toward center)
                                xPos = layout.x - fingerClusterSqueeze;
                            }
                        }
                        // Offset ALL keys left to keep keyboard left-aligned
                        // (compensates for left finger cluster shifting right)
                        xPos -= fingerClusterSqueeze;
                    }

                    const isSelected = isKeySelected(row, col);
                    const standardKeyClassName = isGhostKey
                        ? cn("transition-opacity duration-200", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                        : "";

                    const standardKey = (
                        <Key
                            key={`${row}-${col}`}
                            x={xPos}
                            y={yPos}
                            w={layout.w}
                            h={layout.h}
                            keycode={keycodeName}
                            label={label}
                            row={row}
                            col={col}
                            selected={isKeySelected(row, col)}
                            onClick={handleKeyClick}
                            onDoubleClick={isGhostKey ? () => {
                                if (onGhostNavigate) {
                                    onGhostNavigate(ghostSourceLayer);
                                } else {
                                    setSelectedLayer(ghostSourceLayer);
                                }
                            } : undefined}
                            keyContents={keyContents}
                            layerColor={activeLayerColor}
                            headerClassName={keyHeaderClassFull}
                            hoverBackgroundColor={keyHoverBg}
                            hoverBorderColor={keyHoverBorder}
                            hoverLayerColor={keyHoverLayerColor}
                            variant={keyVariant}
                            layerIndex={selectedLayer}
                            hasPendingChange={hasPendingChangeForKey(selectedLayer, row, col)}
                            disableTooltip={true}
                            className={standardKeyClassName}
                        />
                    );

                    if (!isGhostKey) {
                        return standardKey;
                    }

                    // Render Ghost Key Overlay
                    const isTrnsOrNo = Number(effectiveKeycode) === 1 || Number(effectiveKeycode) === 0 || Number.isNaN(Number(effectiveKeycode));
                    const { label: ghostDefaultLabel, keyContents: ghostKeyContents } = getKeyLabel(keyboard, effectiveKeycode);
                    const ghostKeycodeName = getKeycodeName(effectiveKeycode);

                    // Use empty label if TRNS/NO to avoid "0x0000" or "OXNAN"
                    // Also check for "0xNaN" string which might come from invalid keycode formatting
                    const isInvalidLabel =
                        ghostKeycodeName.toLowerCase() === "0xnan" ||
                        ghostDefaultLabel.toLowerCase() === "0xnan" ||
                        ghostKeycodeName.toLowerCase() === "0x0000" ||
                        ghostDefaultLabel.toLowerCase() === "0x0000";
                    const ghostLabel = (isTrnsOrNo || isInvalidLabel) ? "" : (getLabelForKeycode(ghostKeycodeName, internationalLayout) || ghostDefaultLabel);

                    // Styles for ghost key
                    const ghostLayerColor = isTransmitting ? "sidebar" : effectiveLayerColor;
                    const ghostHeaderClass = headerClasses[ghostLayerColor] || headerClasses["primary"];
                    const ghostHoverHeaderClass = hoverHeaderClasses[ghostLayerColor] || hoverHeaderClasses["primary"];
                    const ghostHeaderClassFull = `${ghostHeaderClass} ${ghostHoverHeaderClass}`;


                    const sourceLayerName = svalService.getLayerName(keyboard, ghostSourceLayer);
                    const tooltipText = sourceLayerName.startsWith("Layer") ? sourceLayerName : `Layer ${sourceLayerName}`;

                    // Calculate darker border color
                    const layerColorObj = layerColors.find(c => c.name === ghostLayerColor) || layerColors[0];
                    const hex = layerColorObj.hex;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    const r2 = Math.round(r * 0.7).toString(16).padStart(2, '0');
                    const g2 = Math.round(g * 0.7).toString(16).padStart(2, '0');
                    const b2 = Math.round(b * 0.7).toString(16).padStart(2, '0');
                    const darkBorderColor = `#${r2}${g2}${b2}`;

                    const ghostOverlay = (
                        <Key
                            key={`${row}-${col}-ghost`}
                            x={xPos}
                            y={yPos}
                            w={layout.w}
                            h={layout.h}
                            keycode={ghostKeycodeName}
                            label={ghostLabel}
                            row={row}
                            col={col}
                            onClick={handleKeyClick} // Clicking ghost selects the key slot on CURRENT layer
                            onDoubleClick={() => {
                                if (onGhostNavigate) {
                                    onGhostNavigate(ghostSourceLayer);
                                } else {
                                    setSelectedLayer(ghostSourceLayer);
                                }
                            }}
                            keyContents={ghostKeyContents}
                            layerColor={ghostLayerColor}
                            headerClassName={ghostHeaderClassFull}
                            // Ghost styles
                            className={cn("border-solid border-[3px] transition-opacity", isSelected ? "opacity-0" : "opacity-50 group-hover:opacity-0")}
                            // Override border color via style to match the specific darkened color
                            style={{ borderColor: darkBorderColor, pointerEvents: "none" }}
                            // Dragging a ghost key should behave like dragging the real transparent key slot
                            dragItemData={{
                                keycode: keycodeName,
                                label,
                                row,
                                col,
                                layer: selectedLayer,
                                extra: keyContents,
                                props: {
                                    x: 0,
                                    y: 0,
                                    w: layout.w,
                                    h: layout.h,
                                    row,
                                    col,
                                    keycode: keycodeName,
                                    label,
                                    keyContents,
                                    layerColor: activeLayerColor,
                                    headerClassName: keyHeaderClassFull,
                                    hoverBorderColor: keyHoverBorder,
                                    hoverBackgroundColor: keyHoverBg,
                                    hoverLayerColor: keyHoverLayerColor,
                                    isRelative: true,
                                    variant: keyVariant,
                                    className: "",
                                    selected: false,
                                    disableHover: true,
                                },
                            }}
                            variant={keyVariant}
                            layerIndex={selectedLayer} // Important: belongs to current layer logic
                            hasPendingChange={hasPendingChangeForKey(selectedLayer, row, col)}
                            disableTooltip={true} // Disable native tooltip, we use custom one
                        />
                    );

                    const wrapperStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: `${xPos * currentUnitSize}px`,
                        top: `${yPos * currentUnitSize}px`,
                        width: `${layout.w * currentUnitSize}px`,
                        height: `${layout.h * currentUnitSize}px`,
                    };

                    return (
                        <Tooltip delayDuration={0} key={`${row}-${col}-fragment`}>
                            <TooltipTrigger asChild>
                                <div
                                    className="group"
                                    style={wrapperStyle}
                                    onDoubleClick={() => {
                                        if (onGhostNavigate) {
                                            onGhostNavigate(ghostSourceLayer);
                                        } else {
                                            setSelectedLayer(ghostSourceLayer);
                                        }
                                    }}
                                >
                                    {React.cloneElement(standardKey, { x: 0, y: 0 })}
                                    {React.cloneElement(ghostOverlay, { x: 0, y: 0 })}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent
                                className={cn(`bg-kb-${ghostLayerColor} border-none`, colorClasses[ghostLayerColor] || "text-white")}
                                arrowStyle={{ backgroundColor: hex, fill: 'transparent' }}
                                side="top"
                            >
                                {tooltipText}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>

        </div>
    );
};
