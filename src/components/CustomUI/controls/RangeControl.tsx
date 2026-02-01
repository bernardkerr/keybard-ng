import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { CustomUIMenuItem } from "@/types/vial.types";

interface RangeControlProps {
    item: CustomUIMenuItem;
    value: number;
    onChange: (value: number) => void;
    compact?: boolean;
}

export const RangeControl: React.FC<RangeControlProps> = ({ item, value, onChange, compact = false }) => {
    // Options format: [min, max] or [min, max, step]
    const options = item.options as number[] | undefined;
    const min = options?.[0] ?? 0;
    const max = options?.[1] ?? 255;
    const step = options?.[2] ?? 1;

    if (compact) {
        // Compact: label on top, slider + input inline below
        return (
            <div className="flex flex-col gap-0.5 py-0.5">
                <span className="text-xs">{item.label}</span>
                <div className="flex flex-row items-center gap-1.5">
                    <Slider
                        value={[value]}
                        onValueChange={(values) => onChange(values[0])}
                        min={min}
                        max={max}
                        step={step}
                        className="w-20"
                    />
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(parseInt(e.target.value) || min)}
                        className="w-14 h-6 text-xs text-right px-1"
                        min={min}
                        max={max}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 p-2 panel-layer-item">
            <span className="text-md">{item.label}</span>
            <div className="flex flex-row items-center gap-3">
                <Slider
                    value={[value]}
                    onValueChange={(values) => onChange(values[0])}
                    min={min}
                    max={max}
                    step={step}
                    className="flex-grow"
                />
                <Input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || min)}
                    className="w-20 text-right"
                    min={min}
                    max={max}
                />
            </div>
        </div>
    );
};
