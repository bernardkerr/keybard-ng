import MacrosIcon from "@/components/icons/MacrosIcon";
import { useVial } from "@/contexts/VialContext";
import { useState } from "react";
import BindingsList from "../components/BindingsList";

const MacrosPanel = () => {
    const { keyboard } = useVial();
    const macros = (keyboard as any)?.macros || [];
    const [itemToEdit, setItemToEdit] = useState<number | null>(null);
    return (
        <BindingsList
            icon={<MacrosIcon className="h-4 w-4 text-white" />}
            items={macros}
            setItemToEdit={(index) => {
                setItemToEdit(index);
            }}
            editElement={itemToEdit !== null ? <div>Edit Macro {itemToEdit}</div> : undefined}
        />
    );
};

export default MacrosPanel;
