import { useVial } from "@/contexts/VialContext";
import { getKeyContents } from "@/utils/keys";
import { FC, useState } from "react";
import { Key } from "@/components/Key";
import { useLayer } from "@/contexts/LayerContext";
import { hoverBackgroundClasses, hoverBorderClasses, hoverHeaderClasses } from "@/utils/colors";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { usePanels } from "@/contexts/PanelsContext";
import { cn } from "@/lib/utils";
import { DragItem, useDrag } from "@/contexts/DragContext";

import { Trash2 } from "lucide-react";
import { DelayedTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
// ... (imports)

interface Props {
    label?: string;
    binding?: any;
    index: number;
    onDelete?: () => void;
    onDrop?: (item: DragItem) => void;
}

const MacroEditorKey: FC<Props> = ({ label, binding, index, onDelete, onDrop }) => {
    const { keyboard } = useVial();
    const { selectedLayer } = useLayer();
    const { selectMacroKey, selectedTarget } = useKeyBinding();
    const { itemToEdit: mid } = usePanels();
    const { isDragging, draggedItem, markDropConsumed } = useDrag();
    const [isDragHover, setIsDragHover] = useState(false);

    const layerColorName = keyboard?.cosmetic?.layer_colors?.[selectedLayer] || "primary";
    const hoverBorderColor = hoverBorderClasses[layerColorName] || hoverBorderClasses["primary"];
    const hoverBackgroundColor = hoverBackgroundClasses[layerColorName] || hoverBackgroundClasses["primary"];
    const hoverHeaderClass = hoverHeaderClasses[layerColorName] || hoverHeaderClasses["primary"];

    const isSelected = selectedTarget?.type === "macro" && selectedTarget.macroId === mid && selectedTarget.macroIndex === index;

    const keycode = binding || "KC_NO";
    const keyContents = getKeyContents(keyboard!, keycode);
    const hasContent = binding && binding !== "" && binding !== "KC_NO";

    let keyColor: string | undefined;
    let keyClassName: string;
    let headerClass: string;

    if (isSelected) {
        // Selected: Red Border, transparent-ish BG? Or let Key handle it?
        // Tapdance uses: keyColor=undefined, keyClass="border-2 border-red-600", header="bg-black/20"
        keyColor = undefined;
        keyClassName = "border-2 border-red-600";
        headerClass = "bg-black/20";
    } else if (isDragHover && isDragging && onDrop) {
        // Drag Hover State: Double Border effect
        keyColor = undefined;
        keyClassName = "bg-red-500 border-kb-gray ring-2 ring-red-500 ring-offset-1 ring-offset-background";
        headerClass = "bg-red-600 text-white";
    } else if (hasContent) {
        // Assigned: Black Key
        // keyColor="sidebar" (which usually means black/dark grey), keyClass="border-kb-gray"
        keyColor = "sidebar";
        keyClassName = "border-kb-gray";
        headerClass = "bg-kb-sidebar-dark";
    } else {
        // Empty: Transparent + Black Border
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

    return (
        <div className="relative w-full">
            <div className="flex flex-row justify-start items-center gap-4 peer">
                <div
                    className="flex-shrink-0 relative w-[60px] h-[60px]"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                >
                    <Key
                        isRelative
                        x={0}
                        y={0}
                        w={1}
                        h={1}
                        row={-1}
                        col={-1}
                        keycode={keycode}
                        label={keyContents?.str || ""}
                        keyContents={keyContents}
                        layerColor={keyColor}
                        headerClassName={isSelected ? headerClass : (hasContent ? `bg-kb-sidebar-dark ${hoverHeaderClass}` : headerClass)}
                        className={cn("w-full h-full", keyClassName)}
                        hoverBorderColor={hoverBorderColor}
                        hoverBackgroundColor={hoverBackgroundColor}
                        hoverLayerColor={layerColorName}
                        selected={isSelected}
                        onClick={() => selectMacroKey(mid!, index)}
                        disableTooltip={true}
                        disableHover={isDragging}
                        dragItemData={{
                            editorType: "macro",
                            editorId: mid!,
                            editorSlot: index
                        }}
                    />
                </div>
                <div className="flex flex-row items-center flex-grow">
                    {label && <div className="font-medium text-gray-600 px-2">{label}</div>}
                </div>
            </div>
            {onDelete && (
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 peer-hover:opacity-100 hover:opacity-100 transition-opacity z-10">
                    <DelayedTooltip>
                        <TooltipTrigger asChild>
                            <button
                                className="p-2 text-gray-400 hover:bg-red-500 hover:text-white rounded-full bg-kb-gray-medium"
                                onClick={onDelete}
                                type="button"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Delete item</p>
                        </TooltipContent>
                    </DelayedTooltip>
                </div>
            )}
        </div>
    );
};

export default MacroEditorKey;
