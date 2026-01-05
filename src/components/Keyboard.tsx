import "./Keyboard.css";

import { getKeyLabel, getKeycodeName } from "@/utils/layers";
import React from "react";
import { MATRIX_COLS, SVALBOARD_LAYOUT, UNIT_SIZE } from "../constants/svalboard-layout";

import { useKeyBinding } from "@/contexts/KeyBindingContext";
import type { KeyboardInfo } from "../types/vial.types";
import { Key } from "./Key";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { getLabelForKeycode } from "./Keyboards/layouts";
import { headerClasses, hoverHeaderClasses } from "@/utils/colors";
import { InfoIcon } from "./icons/InfoIcon";

interface KeyboardProps {
    keyboard: KeyboardInfo;
    onKeyClick?: (layer: number, row: number, col: number) => void;
    selectedLayer: number;
    setSelectedLayer: (layer: number) => void;
}

// Fix unused var warning
export const Keyboard: React.FC<KeyboardProps> = ({ keyboard, selectedLayer }) => {
    const { selectKeyboardKey, selectedTarget, clearSelection } = useKeyBinding();
    const [showInfoPanel, setShowInfoPanel] = React.useState(false);

    React.useEffect(() => {
        if (selectedTarget) {
            setShowInfoPanel(true);
        }
    }, [selectedTarget]);
    const { internationalLayout } = useLayoutSettings();
    const layerColor = keyboard.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const headerClass = headerClasses[layerColor] || headerClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColor] || hoverHeaderClasses["primary"];
    // Get the keymap for the selected layer
    const layerKeymap = keyboard.keymap?.[selectedLayer] || [];

    // Check if this key is the globally selected target
    const isKeySelected = (row: number, col: number) => {
        return selectedTarget?.type === "keyboard" && selectedTarget.layer === selectedLayer && selectedTarget.row === row && selectedTarget.col === col;
    };

    const handleKeyClick = (row: number, col: number) => {
        // if key is already selected, deselect it
        if (isKeySelected(row, col)) {
            clearSelection();
            return;
        }
        selectKeyboardKey(selectedLayer, row, col);
    };

    // Calculate the keyboard dimensions for the container
    const calculateKeyboardSize = () => {
        let maxX = 0;
        let maxY = 0;

        Object.values(SVALBOARD_LAYOUT).forEach((key) => {
            maxX = Math.max(maxX, key.x + key.w);
            maxY = Math.max(maxY, key.y + key.h);
        });

        return {
            width: maxX * UNIT_SIZE,
            height: maxY * UNIT_SIZE,
        };
    };

    const { width, height } = calculateKeyboardSize();

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="keyboard-layout" style={{ width: `${width}px`, height: `${height}px` }}>
                {Object.entries(SVALBOARD_LAYOUT).map(([matrixPos, layout]) => {
                    const pos = Number(matrixPos);
                    const row = Math.floor(pos / MATRIX_COLS);
                    const col = pos % MATRIX_COLS;

                    // Get the keycode for this position in the current layer
                    const keycode = layerKeymap[pos] || 0;
                    const { label: defaultLabel, keyContents } = getKeyLabel(keyboard, keycode);
                    const keycodeName = getKeycodeName(keycode);

                    // Try to get international label
                    const internationalLabel = getLabelForKeycode(getKeycodeName(keycode), internationalLayout);
                    const label = internationalLabel || defaultLabel;

                    return (
                        <Key
                            key={`${row}-${col}`}
                            x={layout.x}
                            y={layout.y}
                            w={layout.w}
                            h={layout.h}
                            keycode={keycodeName}
                            label={label}
                            row={row}
                            col={col}
                            selected={isKeySelected(row, col)}
                            onClick={handleKeyClick}
                            keyContents={keyContents}
                            layerColor={layerColor}
                            headerClassName={`${headerClass} ${hoverHeaderClass}`}
                        />
                    );
                })}
            </div>

            <div className="absolute bottom-5 right-5 flex flex-col items-end z-50">
                {showInfoPanel ? (
                    <div
                        className="bg-white text-black p-4 rounded-2xl shadow-md min-w-[200px] transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold m-0">Selected Key</h4>
                            <button
                                onClick={() => setShowInfoPanel(false)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black"
                                title="Close"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        {selectedTarget ? (
                            <div className="text-sm space-y-1">
                                <p>
                                    <b>Position</b>: Row {selectedTarget.row}, Col {selectedTarget.col}
                                </p>
                                <p>
                                    <b>Matrix</b>: {(selectedTarget.row || 0) * MATRIX_COLS + (selectedTarget.col || 0)}
                                </p>
                                <p>
                                    <b>Keycode</b>: {getKeycodeName(layerKeymap[(selectedTarget.row || 0) * MATRIX_COLS + (selectedTarget.col || 0)] || 0)}
                                </p>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic text-sm">No key selected</p>
                        )}
                    </div>
                ) : (
                    <button
                        className="bg-white text-black w-12 h-12 flex items-center justify-center rounded-xl shadow-md hover:bg-gray-50 transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowInfoPanel(true);
                        }}
                        title="Show Key Info"
                    >
                        <InfoIcon />
                    </button>
                )}
            </div>
        </div>
    );
};
