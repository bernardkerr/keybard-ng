import "react-simple-keyboard/build/css/index.css";

import { FunctionComponent, useState } from "react";

import Keyboard from "react-simple-keyboard";

interface IProps {
    onChange: (input: string) => void;
    onKeyPress?: (button: string) => void;
    keyboardRef: any;
}

const InternationalKeyboard: FunctionComponent<IProps> = ({ onChange, onKeyPress: onKeyPressCallback, keyboardRef }) => {
    const [layoutName, setLayoutName] = useState("default");
    const onKeyPress = (button: string) => {
        if (button === "{shift}" || button === "{lock}") {
            setLayoutName(layoutName === "default" ? "shift" : "default");
        }
        // Call the callback if provided
        if (onKeyPressCallback) {
            onKeyPressCallback(button);
        }
    };
    const commonKeyboardOptions = {
        onChange: (input: string) => onChange(input),
        onKeyPress: (button: any) => onKeyPress(button),
        theme: "simple-keyboard hg-theme-default hg-layout-default",
        physicalKeyboardHighlight: true,
        syncInstanceInputs: true,
        mergeDisplay: true,
        debug: true,
    };

    const keyboardOptions = {
        ...commonKeyboardOptions,
        /**
         * Layout by:
         * Sterling Butters (https://github.com/SterlingButters)
         */
        layout: {
            default: [
                "# \\",
                "` 1 2 3 4 5 6 7 8 9 0 - = {backspace}",
                "{tab} q w e r t y u i o p [ ] \\",
                "{capslock} a s d f g h j k l ; ' {enter}",
                "{shiftleft} z x c v b n m , . / {shiftright}",
                "{controlleft} {altleft} {metaleft} {space} {metaright} {altright} {controlright}",
            ],
            shift: [
                "{escape} {f1} {f2} {f3} {f4} {f5} {f6} {f7} {f8} {f9} {f10} {f11} {f12}",
                "~ ! @ # $ % ^ & * ( ) _ + {backspace}",
                "{tab} Q W E R T Y U I O P { } |",
                '{capslock} A S D F G H J K L : " {enter}',
                "{shiftleft} Z X C V B N M < > ? {shiftright}",
                "{controlleft} {altleft} {metaleft} {space} {metaright} {altright} {controlright}",
            ],
        },
        display: {
            "{escape}": "esc",
            "{tab}": "tab",
            "{backspace}": "bksp",
            "{enter}": "enter",
            "{capslock}": "caps lock",
            "{shiftleft}": "lshift",
            "{shiftright}": "rshift",
            "{controlleft}": "lctrl",
            "{controlright}": "rctrl",
            "{altleft}": "alt",
            "{altright}": "alt",
            "{metaleft}": "GUI",
            "{metaright}": "GUI",
        },
    };

    return <Keyboard keyboardRef={(r) => (keyboardRef.current = r)} layoutName={layoutName} onRender={() => console.log("Rendered")} {...keyboardOptions} />;
};

export default InternationalKeyboard;
