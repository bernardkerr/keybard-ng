import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { hsvToHex, hexToHsv } from "@/utils/color-conversion";
import { cn } from "@/lib/utils";

interface CustomColorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // LED color initial values (hardware HSV)
    initialLedHue?: number;
    initialLedSat?: number;
    initialLedVal?: number;
    // Display color initial values (for UI)
    initialDisplayHue?: number;
    initialDisplaySat?: number;
    initialDisplayVal?: number;
    // Callback with both colors
    onApply: (
        displayHsv: { hue: number; sat: number; val: number },
        ledHsv: { hue: number; sat: number; val: number }
    ) => void;
    layerName?: string;
}

type ColorTarget = 'display' | 'led';

/**
 * Dialog for selecting custom HSV colors for layer lights
 * Supports independent Display and LED color selection
 * Uses 0-255 range for all HSV values (QMK/Svalboard format)
 */
const CustomColorDialog = ({
    open,
    onOpenChange,
    initialLedHue = 85,
    initialLedSat = 255,
    initialLedVal = 200,
    initialDisplayHue = 85,
    initialDisplaySat = 255,
    initialDisplayVal = 200,
    onApply,
    layerName,
}: CustomColorDialogProps) => {
    // Display color state
    const [displayHue, setDisplayHue] = useState(initialDisplayHue);
    const [displaySat, setDisplaySat] = useState(initialDisplaySat);
    const [displayVal, setDisplayVal] = useState(initialDisplayVal);

    // LED color state
    const [ledHue, setLedHue] = useState(initialLedHue);
    const [ledSat, setLedSat] = useState(initialLedSat);
    const [ledVal, setLedVal] = useState(initialLedVal);

    // Which color is being edited
    const [activeTarget, setActiveTarget] = useState<ColorTarget>('display');

    // Hex editing state
    const [isEditingHex, setIsEditingHex] = useState(false);
    const [hexInput, setHexInput] = useState('');
    const hexInputRef = useRef<HTMLInputElement>(null);

    // Reset to initial values when dialog opens
    useEffect(() => {
        if (open) {
            setDisplayHue(initialDisplayHue);
            setDisplaySat(initialDisplaySat);
            setDisplayVal(initialDisplayVal);
            setLedHue(initialLedHue);
            setLedSat(initialLedSat);
            setLedVal(initialLedVal);
            setActiveTarget('display');
            setIsEditingHex(false);
        }
    }, [open, initialDisplayHue, initialDisplaySat, initialDisplayVal, initialLedHue, initialLedSat, initialLedVal]);

    // Get active color values
    const getActiveHsv = () => {
        if (activeTarget === 'display') {
            return { hue: displayHue, sat: displaySat, val: displayVal };
        }
        return { hue: ledHue, sat: ledSat, val: ledVal };
    };

    // Set active color values
    const setActiveHue = (v: number) => {
        if (activeTarget === 'display') setDisplayHue(v);
        else setLedHue(v);
    };
    const setActiveSat = (v: number) => {
        if (activeTarget === 'display') setDisplaySat(v);
        else setLedSat(v);
    };
    const setActiveVal = (v: number) => {
        if (activeTarget === 'display') setDisplayVal(v);
        else setLedVal(v);
    };

    const activeHsv = getActiveHsv();
    const displayColor = hsvToHex(displayHue, displaySat, displayVal);
    const ledColor = hsvToHex(ledHue, ledSat, ledVal);
    const activeColor = hsvToHex(activeHsv.hue, activeHsv.sat, activeHsv.val);

    const handleApply = () => {
        onApply(
            { hue: displayHue, sat: displaySat, val: displayVal },
            { hue: ledHue, sat: ledSat, val: ledVal }
        );
        onOpenChange(false);
    };

    // Handle hex input
    const startEditingHex = () => {
        setHexInput(activeColor);
        setIsEditingHex(true);
        setTimeout(() => hexInputRef.current?.select(), 0);
    };

    const applyHexInput = () => {
        setIsEditingHex(false);
        let hex = hexInput.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            const hsv = hexToHsv(hex);
            if (activeTarget === 'display') {
                setDisplayHue(hsv.hue);
                setDisplaySat(hsv.sat);
                setDisplayVal(hsv.val);
            } else {
                setLedHue(hsv.hue);
                setLedSat(hsv.sat);
                setLedVal(hsv.val);
            }
        }
    };

    const handleHexKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            applyHexInput();
        } else if (e.key === 'Escape') {
            setIsEditingHex(false);
        }
    };

    // Generate hue gradient for the slider track
    const hueGradient = `linear-gradient(to right,
        hsl(0, 100%, 50%),
        hsl(60, 100%, 50%),
        hsl(120, 100%, 50%),
        hsl(180, 100%, 50%),
        hsl(240, 100%, 50%),
        hsl(300, 100%, 50%),
        hsl(360, 100%, 50%)
    )`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Custom Layer Color</DialogTitle>
                    <DialogDescription>
                        {layerName
                            ? `Set custom colors for "${layerName}" layer.`
                            : "Set custom colors for the layer."
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Color Preview Circles */}
                    <div className="flex items-center justify-center gap-4">
                        {/* Display Color Circle (Large) */}
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    "w-20 h-20 rounded-full cursor-pointer transition-all",
                                    activeTarget === 'display' ? "" : "hover:scale-105"
                                )}
                                style={{
                                    backgroundColor: displayColor,
                                    boxShadow: activeTarget === 'display'
                                        ? `0 0 0 4px black, 0 0 20px ${displayColor}80`
                                        : `0 0 0 4px transparent`
                                }}
                                onClick={() => setActiveTarget('display')}
                            />
                            <span className="text-xs text-muted-foreground">Display</span>
                        </div>

                        {/* LED Color Circle (Small) */}
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full cursor-pointer transition-all",
                                    activeTarget === 'led' ? "" : "hover:scale-105"
                                )}
                                style={{
                                    backgroundColor: ledColor,
                                    boxShadow: activeTarget === 'led'
                                        ? `0 0 0 4px black, 0 0 20px ${ledColor}80`
                                        : `0 0 0 4px transparent`
                                }}
                                onClick={() => setActiveTarget('led')}
                            />
                            <span className="text-xs text-muted-foreground">LED</span>
                        </div>
                    </div>

                    {/* Active target label */}
                    <div className="text-center text-sm font-medium">
                        Editing: {activeTarget === 'display' ? 'Display Color' : 'LED Color'}
                    </div>

                    {/* Hue Slider */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="hue">Hue</Label>
                            <span className="text-sm text-muted-foreground w-12 text-right">{activeHsv.hue}</span>
                        </div>
                        <div
                            className="relative rounded-full h-3 overflow-hidden"
                            style={{ background: hueGradient }}
                        >
                            <Slider
                                id="hue"
                                min={0}
                                max={255}
                                step={1}
                                value={[activeHsv.hue]}
                                onValueChange={([v]) => setActiveHue(v)}
                                className="absolute inset-0 [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent"
                            />
                        </div>
                    </div>

                    {/* Saturation Slider */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="sat">Saturation</Label>
                            <span className="text-sm text-muted-foreground w-12 text-right">{activeHsv.sat}</span>
                        </div>
                        <div
                            className="relative rounded-full h-3 overflow-hidden"
                            style={{
                                background: `linear-gradient(to right,
                                    ${hsvToHex(activeHsv.hue, 0, activeHsv.val)},
                                    ${hsvToHex(activeHsv.hue, 255, activeHsv.val)}
                                )`
                            }}
                        >
                            <Slider
                                id="sat"
                                min={0}
                                max={255}
                                step={1}
                                value={[activeHsv.sat]}
                                onValueChange={([v]) => setActiveSat(v)}
                                className="absolute inset-0 [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent"
                            />
                        </div>
                    </div>

                    {/* Value/Brightness Slider */}
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="val">Brightness</Label>
                            <span className="text-sm text-muted-foreground w-12 text-right">{activeHsv.val}</span>
                        </div>
                        <div
                            className="relative rounded-full h-3 overflow-hidden"
                            style={{
                                background: `linear-gradient(to right,
                                    ${hsvToHex(activeHsv.hue, activeHsv.sat, 0)},
                                    ${hsvToHex(activeHsv.hue, activeHsv.sat, 255)}
                                )`
                            }}
                        >
                            <Slider
                                id="val"
                                min={0}
                                max={255}
                                step={1}
                                value={[activeHsv.val]}
                                onValueChange={([v]) => setActiveVal(v)}
                                className="absolute inset-0 [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent"
                            />
                        </div>
                    </div>

                    {/* Hex value display / input */}
                    <div className="flex items-center justify-center">
                        {isEditingHex ? (
                            <Input
                                ref={hexInputRef}
                                value={hexInput}
                                onChange={(e) => setHexInput(e.target.value)}
                                onBlur={applyHexInput}
                                onKeyDown={handleHexKeyDown}
                                className="w-28 text-center text-sm font-mono"
                                maxLength={7}
                                autoFocus
                            />
                        ) : (
                            <button
                                onClick={startEditingHex}
                                className="text-sm text-muted-foreground hover:text-foreground hover:underline cursor-pointer font-mono"
                            >
                                {activeColor.toUpperCase()}
                            </button>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleApply}>
                        Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CustomColorDialog;
