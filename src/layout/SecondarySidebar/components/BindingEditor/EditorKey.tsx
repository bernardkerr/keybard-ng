import { FC, useState } from "react";
import { Trash2 } from "lucide-react";
import { Key } from "@/components/Key";
import { useVial } from "@/contexts/VialContext";
import { useLayer } from "@/contexts/LayerContext";
import { getKeyContents } from "@/utils/keys";
import { keyService } from "@/services/key.service";
import { hoverBackgroundClasses, hoverBorderClasses } from "@/utils/colors";
import { DragItem, useDrag } from "@/contexts/DragContext";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { getLabelForKeycode } from "@/components/Keyboards/layouts";

interface EditorKeyProps {
    keycode: string;
    label?: string; // Additional label to display (e.g. "Output", "1", "2")
    selected?: boolean;
    onClick: () => void;
    onClear?: () => void;
    size?: string; // Class for size, e.g. "w-[60px] h-[60px]"
    trashOffset?: string; // Class for trash icon positioning e.g. "-left-10"
    trashSize?: string; // Class for trash icon size e.g. "w-4 h-4"
    variant?: "default" | "medium" | "small";
    labelClassName?: string; // Class for the label text
    wrapperClassName?: string; // Class for the wrapper div
    showTrash?: boolean; // Whether the trash icon is enabled (defaults to true if onClear is provided)
    onDrop?: (item: DragItem) => void;
}

const EditorKey: FC<EditorKeyProps> = ({
    keycode,
    label,
    selected = false,
    onClick,
    onClear,
    size = "w-[60px] h-[60px]",
    trashOffset = "-left-10",
    trashSize = "w-4 h-4",
    variant = "default",
    labelClassName = "text-sm font-bold text-slate-600",
    wrapperClassName = "flex flex-col items-center gap-1 relative",
    showTrash = true,
    onDrop
}) => {
    const { keyboard } = useVial();
    const { selectedLayer } = useLayer();
    const { isDragging, draggedItem, markDropConsumed } = useDrag();
    const [isDragHover, setIsDragHover] = useState(false);
    const { internationalLayout } = useLayoutSettings();

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];

    const keyContents = getKeyContents(keyboard!, keyService.canonical(keycode));
    const hasContent = (keyContents?.top && keyContents.top !== "KC_NO") ||
        (keyContents?.str && keyContents.str !== "KC_NO" && keyContents.str !== "");

    // Determine visual style
    let keyColor: string | undefined;
    let keyClassName: string;
    let headerClass: string;

    if (selected) {
        keyColor = undefined;
        keyClassName = "border-2 border-red-600";
        headerClass = "bg-black/20";
    } else if (isDragHover && isDragging && onDrop) {
        // Drag Hover State: Double Border effect
        keyColor = undefined;
        keyClassName = "bg-red-500 border-kb-gray ring-2 ring-red-500 ring-offset-1 ring-offset-background";
        headerClass = "bg-red-600 text-white";
    } else if (hasContent) {
        keyColor = "sidebar";
        keyClassName = "border-kb-gray";
        headerClass = "bg-kb-sidebar-dark";
    } else {
        keyColor = undefined;
        keyClassName = "bg-transparent border-2 border-black";
        headerClass = "text-black";
    }

    const handleMouseEnter = () => {
        if (isDragging && onDrop) {
            setIsDragHover(true);
        }
    };

    const handleMouseLeave = () => {
        setIsDragHover(false);
    };

    const handleMouseUp = () => {
        if (isDragging && isDragHover && draggedItem && onDrop) {
            markDropConsumed();
            onDrop(draggedItem);
            setIsDragHover(false);
        }
    };

    // Calculate the correct label for display, respecting international layout overrides
    const internationalLabel = getLabelForKeycode(keycode, internationalLayout);
    const fallbackLabel = ((!keyContents?.type || keyContents.type === 'key') && keyContents?.str?.includes('\n') ? keyContents.str.split('\n').pop() : keyContents?.str) || "";
    // If internationalLabel is present, use it. But allow explicit 'label' prop to override everything.
    // If no internationalLabel, fall back to default keyContents logic.
    const displayLabel = label || internationalLabel || fallbackLabel;

    return (
        <div className={wrapperClassName}>
            {label && <span className={labelClassName}>{label}</span>}
            <div
                className={`relative ${size} group/editorkey`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
            >
                <Key
                    isRelative
                    x={0} y={0} w={1} h={1} row={-1} col={-1}
                    keycode={keycode || "KC_NO"}
                    label={displayLabel}
                    keyContents={keyContents}
                    selected={selected}
                    onClick={() => {
                        onClick();
                    }}
                    layerColor={keyColor}
                    className={keyClassName}
                    headerClassName={headerClass}
                    hoverBorderColor={hoverBorderColor}
                    hoverBackgroundColor={hoverBackgroundColor}
                    hoverLayerColor={layerColorName}
                    variant={variant}
                    disableTooltip={true}
                    disableHover={isDragging}
                />

                {hasContent && showTrash && onClear && (
                    <div className={`absolute ${trashOffset} top-0 h-full flex items-center justify-center opacity-0 group-hover/editorkey:opacity-100 transition-opacity`}>
                        <button
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear();
                            }}
                            title="Clear key"
                            type="button"
                        >
                            <Trash2 className={trashSize} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditorKey;
