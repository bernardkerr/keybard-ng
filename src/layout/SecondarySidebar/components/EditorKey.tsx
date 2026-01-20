import MacrosIcon from "@/components/icons/MacrosIcon";
import { FC, useRef, useId } from "react";
import { useDrag } from "@/contexts/DragContext";
import { cn } from "@/lib/utils";

export interface EditorKeyProps {
    label?: string;
    binding?: any;
    onClick?: () => void;
    selected?: boolean;
}

const classes = {
    key: "bg-white border border-kb-gray-border border-2 w-12 h-12 rounded-md cursor-pointer hover:border-red-600 transition-all flex flex-col select-none",
    emptyKey:
        "bg-kb-green text-white w-12 h-12 rounded-md cursor-pointer hover:border-2 border-2 border border-transparent hover:border-red-600 transition-all flex items-center justify-center text-wrap text-center text-xs flex-col select-none",
    selectedKey: "!bg-red-600 border-2 border-red-600 text-white",
    dragSource: "!bg-kb-light-grey border-kb-light-grey text-transparent opacity-65 select-none",
};

const EditorKey: FC<EditorKeyProps> = ({ label, binding, onClick, selected }) => {
    const { startDrag, dragSourceId } = useDrag();
    const uniqueId = useId();

    // We need to keep track of the start position to determine dragged threshold
    const startPosRef = useRef<{ x: number, y: number } | null>(null);

    const keyClass = binding.str !== "" ? classes.emptyKey : classes.key;

    // Handle newlines in the display text (for user keys)
    const displayText = binding.str !== "" ? binding.str : "";

    // Check if this specific instance is being dragged
    const isDragSource = dragSourceId === uniqueId;

    // If it is the source, apply specific styles
    const effectiveClass = isDragSource
        ? cn(keyClass, classes.dragSource)
        : selected ? `${keyClass} ${classes.selectedKey}` : keyClass;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        startPosRef.current = { x: e.clientX, y: e.clientY };

        // We add a temporary listener to check for drag initiation
        const checkDrag = (moveEvent: MouseEvent) => {
            const start = startPosRef.current;
            if (!start) return;

            const dx = moveEvent.clientX - start.x;
            const dy = moveEvent.clientY - start.y;

            // Threshold of 5px
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                // Start Drag
                startDrag({
                    keycode: binding.keycode || "",
                    label: label || displayText,
                    type: binding.type || "keyboard",
                    extra: binding,
                    sourceId: uniqueId,
                    width: 48, // Standard EditorKey size
                    height: 48,
                    component: "EditorKey",
                    props: {
                        label,
                        binding,
                        selected: false
                    }
                }, {
                    clientX: moveEvent.clientX,
                    clientY: moveEvent.clientY,
                } as any);

                cleanup();
            }
        };

        const handleUp = () => {
            cleanup();
        };

        const cleanup = () => {
            startPosRef.current = null;
            window.removeEventListener("mousemove", checkDrag);
            window.removeEventListener("mouseup", handleUp);
        };

        window.addEventListener("mousemove", checkDrag);
        window.addEventListener("mouseup", handleUp);
    };

    console.log("rendering editor key", binding, effectiveClass);
    return (
        <div className="flex flex-row justify-start items-center">
            <div
                className={effectiveClass}
                onClick={onClick}
                onMouseDown={handleMouseDown}
            >
                {binding?.type === "macro" && <MacrosIcon className=" mt-2 h-8" />}
                {displayText && <span style={{ whiteSpace: "pre-line" }}>{displayText}</span>}
            </div>
            {label && <div className="font-medium text-gray-600 px-5">{label}</div>}
        </div>
    );
};

export default EditorKey;
