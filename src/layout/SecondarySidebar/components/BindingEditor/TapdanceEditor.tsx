import { FC, useEffect } from "react";

import TapdanceIcon from "@/components/icons/Tapdance";
import { usePanels } from "@/contexts/PanelsContext";
import { useVial } from "@/contexts/VialContext";
import { getKeyContents } from "@/utils/keys";
import EditorKey from "../EditorKey";
import BindingEditorContainer from "./BindingEditorContainer";

interface Props {}

const TapdanceEditor: FC<Props> = () => {
    const { keyboard } = useVial();
    const { setActivePanel, setPanelToGoBack, setAlternativeHeader, itemToEdit } = usePanels();
    const currTapDance = (keyboard as any).tapdances?.[itemToEdit!];
    const keys = {
        tap: getKeyContents(keyboard!, currTapDance.tap),
        doubletap: getKeyContents(keyboard!, currTapDance.doubletap),
        hold: getKeyContents(keyboard!, currTapDance.hold),
        taphold: getKeyContents(keyboard!, currTapDance.taphold),
    };
    useEffect(() => {
        setActivePanel("layers");
        setPanelToGoBack("tapdances");
        setAlternativeHeader(true);
    }, []);

    return (
        <BindingEditorContainer icon={<TapdanceIcon className="h-5 w-5 text-white" />} label="Tapdance Key">
            <div className="px-15 flex flex-col gap-6 py-8">
                <EditorKey label="Tap" binding={keys.tap!} />
                <EditorKey label="Hold" binding={keys.hold!} />
                <EditorKey label="Double-Tap" binding={keys.doubletap!} />
                <EditorKey label="Tap-Hold" binding={keys.taphold!} />
            </div>
        </BindingEditorContainer>
    );
};

export default TapdanceEditor;
