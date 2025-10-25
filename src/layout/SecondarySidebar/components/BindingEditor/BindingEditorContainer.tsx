import { usePanels } from "@/contexts/PanelsContext";
import { X } from "lucide-react";
import { FC } from "react";
import EditorSidePanel from "../EditorSidePanel";

interface Props {
    children: React.ReactNode;
    icon: React.ReactNode;
    label: string;
}

const BindingEditorContainer: FC<Props> = ({ children, icon, label }) => {
    const classes = {
        container: "absolute right-[-400px] bg-kb-gray-medium h-[550px] w-[400px] rounded-r-2xl p-5 flex flex-col top-[calc(50vh-300px)]",
    };
    const { itemToEdit, handleCloseEditor } = usePanels();

    return (
        <div className={classes.container}>
            <div className="flex flex-row w-full items-center pr-5 pl-10 justify-between pt-2">
                <EditorSidePanel parentPanel="tapdances" />
                <div className="flex flex-row items-center">
                    <div className="flex flex-col bg-black h-14 w-14 rounded-sm flex-shrink-0 items-center ">
                        <div className="h-5 w-5 mt-3 text-white">{icon}</div>
                        <span className="text-sm text-white">{itemToEdit}</span>
                    </div>
                    <div className="pl-5 text-xl font-normal">{label}</div>
                </div>
                <button
                    type="button"
                    onClick={handleCloseEditor}
                    className="rounded-sm p-1 text-kb-gray-border transition-all hover:text-black focus:outline-none focus:text-black cursor-pointer"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            {children}
        </div>
    );
};

export default BindingEditorContainer;
