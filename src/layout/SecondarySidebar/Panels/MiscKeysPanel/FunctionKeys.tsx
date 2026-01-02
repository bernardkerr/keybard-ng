import { Key } from "@/components/Key";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { keyService } from "@/services/key.service";

const FunctionKeys = () => {
    const { assignKeycode } = useKeyBinding();

    const keys = Array.from({ length: 24 }, (_, i) => {
        const num = i + 1;
        return {
            label: `F${num}`,
            keycode: `KC_F${num}`,
        };
    });

    return (
        <div className="flex flex-col gap-2">
            <span className="font-semibold text-lg text-slate-700">All Function Keys</span>
            <div className="flex flex-wrap gap-2">
                {keys.map((k) => (
                    <Key
                        key={k.keycode}
                        x={0}
                        y={0}
                        w={1}
                        h={1}
                        row={0}
                        col={0}
                        keycode={k.keycode}
                        label={keyService.define(k.keycode)?.str || k.label}
                        layerColor="sidebar"
                        headerClassName="bg-kb-sidebar-dark"
                        isRelative
                        className="h-[60px] w-[60px]"
                        onClick={() => assignKeycode(k.keycode)}
                    />
                ))}
            </div>
        </div>
    );
};

export default FunctionKeys;
