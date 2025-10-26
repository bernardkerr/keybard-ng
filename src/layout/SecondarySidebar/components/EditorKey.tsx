import { FC } from "react";

interface Props {
    label?: string;
    binding?: any;
    onClick?: () => void;
    selected?: boolean;
}

const classes = {
    key: "bg-white border border-kb-gray-border border-2 w-12 h-12 rounded-md cursor-pointer hover:border-red-600 transition-all",
    emptyKey:
        "bg-kb-green text-white w-12 h-12 rounded-md cursor-pointer hover:border-2 border-2 border border-transparent hover:border-red-600 transition-all flex items-center justify-center text-wrap",
    selectedKey: "border-red-600 border-4",
};

const EditorKey: FC<Props> = ({ label, binding, onClick, selected }) => {
    const keyClass = binding.str !== "" ? classes.emptyKey : classes.key;
    const finalClass = selected ? `${keyClass} ${classes.selectedKey}` : keyClass;

    return (
        <div className="flex flex-row justify-start items-center">
            <div className={finalClass} onClick={onClick}>
                {binding.str !== "" && binding.str}
            </div>
            {label && <div className="font-medium text-gray-600 px-5">{label}</div>}
        </div>
    );
};

export default EditorKey;
