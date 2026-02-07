import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FC, useEffect, useRef } from "react";
import { DelayedTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
    type: string;
    value: any;
    onChange: (value: any) => void;
    onDelete?: () => void;
    autoFocus?: boolean;
}

const MacroEditorText: FC<Props> = ({ type, value, onChange, onDelete, autoFocus }) => {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
            // Optional: Move cursor to end of text
            if (inputRef.current instanceof HTMLTextAreaElement || inputRef.current.type === 'text') {
                const len = String(value).length;
                inputRef.current.setSelectionRange(len, len);
            }
        }
    }, [autoFocus]);

    return (
        <div className="relative w-full">
            <div className="flex flex-row justify-start items-center w-full peer">
                {type === "text" ? (
                    <Textarea
                        ref={inputRef as any}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="bg-white text-black border-input w-[180px] flex-grow-0 select-text"
                    />
                ) : (
                    <Input
                        ref={inputRef as any}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="bg-white text-black border-input w-[180px] flex-grow-0 select-text"
                    />
                )}
                <div className="flex flex-row items-center ml-5">
                    {type && <div className="font-medium text-gray-600">{type === "delay" ? "Delay (ms)" : type.charAt(0).toUpperCase() + type.slice(1)}</div>}
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

export default MacroEditorText;
