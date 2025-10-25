import ComboIcon from "@/components/ComboIcon";
import { useVial } from "@/contexts/VialContext";
import { useState } from "react";
import BindingsList from "../components/BindingsList";

const CombosPanel = () => {
    const { keyboard } = useVial();
    const combos = (keyboard as any)?.combos || [];
    const [itemToEdit, setItemToEdit] = useState<number | null>(null);
    return (
        <BindingsList
            icon={<ComboIcon className="h-4 w-4 text-white" />}
            items={combos}
            setItemToEdit={(index) => {
                setItemToEdit(index);
            }}
            editElement={itemToEdit !== null ? <div>Edit Combo {itemToEdit}</div> : undefined}
        />
    );
};

export default CombosPanel;
