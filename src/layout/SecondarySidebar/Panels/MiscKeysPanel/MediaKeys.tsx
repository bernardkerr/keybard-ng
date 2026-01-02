import { Key } from "@/components/Key";
import { useKeyBinding } from "@/contexts/KeyBindingContext";
import { keyService } from "@/services/key.service";

const MediaKeys = () => {
    const { assignKeycode } = useKeyBinding();

    const keys = [
        { keycode: "KC_PWR", label: "Power" },
        { keycode: "KC_SLEP", label: "Sleep" },
        { keycode: "KC_WAKE", label: "Wake" },
        { keycode: "KC_EXEC", label: "Exec" },
        { keycode: "KC_HELP", label: "Help" },
        { keycode: "KC_SLCT", label: "Select" },
        { keycode: "KC_STOP", label: "Stop" },
        { keycode: "KC_AGIN", label: "Again" },
        { keycode: "KC_UNDO", label: "Undo" },
        { keycode: "KC_CUT", label: "Cut" },
        { keycode: "KC_COPY", label: "Copy" },
        { keycode: "KC_PSTE", label: "Paste" },
        { keycode: "KC_FIND", label: "Find" },
        { keycode: "KC_CALC", label: "Calc" },
        { keycode: "KC_MAIL", label: "Mail" },
        { keycode: "KC_MSEL", label: "Media Player" },
        { keycode: "KC_MYCM", label: "My PC" },
        { keycode: "KC_WSCH", label: "Browser Search" },
        { keycode: "KC_WHOM", label: "Browser Home" },
        { keycode: "KC_WBAK", label: "Browser Back" },
        { keycode: "KC_WFWD", label: "Browser Forward" },
        { keycode: "KC_WSTP", label: "Browser Stop" },
        { keycode: "KC_WREF", label: "Browser Refresh" },
        { keycode: "KC_WFAV", label: "Browser Fav." },
        { keycode: "KC_BRIU", label: "Bright. Up" },
        { keycode: "KC_BRID", label: "Bright. Down" },
        { keycode: "KC_MPRV", label: "Media Prev" },
        { keycode: "KC_MNXT", label: "Media Next" },
        { keycode: "KC_MUTE", label: "Mute" },
        { keycode: "KC_VOLD", label: "Vol -" },
        { keycode: "KC_VOLU", label: "Vol +" },
        { keycode: "KC_MSTP", label: "Media Stop" },
        { keycode: "KC_MPLY", label: "Media Play" },
        { keycode: "KC_MRWD", label: "Prev Track (macOS)" },
        { keycode: "KC_MFFD", label: "Next Track (macOS)" },
        { keycode: "KC_EJCT", label: "Eject" },
        { keycode: "KC_LCAP", label: "Locking Caps" },
        { keycode: "KC_LNUM", label: "Locking Num" },
        { keycode: "KC_LSCR", label: "Locking Scroll" },
    ];

    return (
        <div className="flex flex-col gap-2">
            <span className="font-semibold text-lg text-slate-700">Media Keys</span>
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

export default MediaKeys;
