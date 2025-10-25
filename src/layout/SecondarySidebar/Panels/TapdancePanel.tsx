import TapdanceIcon from "@/components/icons/Tapdance";
import { useVial } from "@/contexts/VialContext";
import BindingsList from "../components/BindingsList";

interface TapdancePanelProps {
    onEditTapdance: (index: number | null) => void;
    currentTapdance: number | null;
}

const TapdancePanel: React.FC<TapdancePanelProps> = ({ onEditTapdance, currentTapdance }) => {
    const { keyboard } = useVial();
    const tapdances = (keyboard as any)?.tapdances || [];
    return <BindingsList icon={<TapdanceIcon className="h-4 w-4 text-white" />} items={tapdances} itemToEdit={currentTapdance} setItemToEdit={onEditTapdance} />;
};

export default TapdancePanel;
