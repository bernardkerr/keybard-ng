import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

const SettingsPanel = () => {
    const { getSetting, updateSetting, settingsDefinitions, settingsCategories } = useSettings();
    const [activeCategory, setActiveCategory] = useState<string>("general");
    return (
        <section className="space-y-3 h-full max-h-full flex flex-col w-full mx-auto py-4">
            <div className="flex flex-row gap-2 justify-stretch align-stretch mb-3 w-full">
                {settingsCategories.map((category) => (
                    <div
                        key={category.name}
                        onClick={() => setActiveCategory(category.name)}
                        className={cn(
                            "w-0 min-w-0 flex-1 flex items-center gap-2 flex-col cursor-pointer py-3 rounded-lg transition-all",
                            activeCategory === category.name ? "bg-black text-white hover:bg-black/80 hover:text-white" : "text-muted-foreground hover:bg-muted bg-muted/60"
                        )}
                    >
                        {category.icon && <category.icon className="h-4 w-4" />}
                        <span className="text-xs font-medium text-center break-words">{category.label}</span>
                    </div>
                ))}
            </div>
            <div className=" flex flex-col overflow-auto flex-grow gap-2">
                {settingsCategories
                    .find((cat) => cat.name === activeCategory)
                    ?.settings.map((se) => {
                        const setting = settingsDefinitions.find((s) => s.name === se);
                        if (!setting) return null;

                        if (setting.type === "boolean") {
                            return (
                                <div className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item group/item" key={setting.name}>
                                    <div className="flex flex-col items-start gap-3">
                                        <span className="text-md text-left">{setting.label}</span>
                                        <span className="text-xs text-muted-foreground">{setting.description}</span>
                                    </div>
                                    <Switch
                                        checked={getSetting(setting.name, setting.defaultValue) as boolean}
                                        onCheckedChange={(checked) => {
                                            updateSetting(setting.name, checked);
                                        }}
                                    />
                                </div>
                            );
                        }
                        if (setting.type === "select") {
                            return (
                                <div className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item group/item" key={setting.name}>
                                    <div className="flex flex-col items-start gap-3">
                                        <div className="text-md text-left">{setting.label}</div>
                                        {setting.description && setting.description !== "" && <span className="text-xs text-muted-foreground">{setting.description}</span>}
                                    </div>
                                    <select
                                        value={getSetting(setting.name, setting.defaultValue) as string}
                                        onChange={(e) => {
                                            updateSetting(setting.name, e.target.value);
                                        }}
                                        className=" h-8 px-3 font-bold rounded-md pr-3 cursor-pointer active:border-none focus:border-none"
                                    >
                                        {setting.items?.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                        }
                        if (setting.type === "action") {
                            return (
                                <div
                                    className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item group/item cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
                                    key={setting.name}
                                    onClick={() => {
                                        console.log(`Action ${setting.action} triggered`);
                                    }}
                                >
                                    <div className="flex flex-col gap-2">
                                        <span className="text-md text-left">{setting.label}</span>
                                        {setting.description ? <span className="text-xs text-muted-foreground">{setting.description}</span> : undefined}
                                    </div>
                                    <span className="text-xs text-muted-foreground">›</span>
                                </div>
                            );
                        }
                        if (setting.type === "slider") {
                            return (
                                <div className="flex flex-col gap-2 p-3 panel-layer-item group/item w-full" key={setting.name}>
                                    <span className="text-md text-left">{setting.label}</span>
                                    <span className="text-xs text-muted-foreground">{setting.description}</span>
                                    <div className="flex flex-row items-center justify-between">
                                        <Slider
                                            value={[getSetting(setting.name, setting.defaultValue) as number]}
                                            onValueChange={(values) => updateSetting(setting.name, values[0])}
                                            min={setting.min}
                                            max={setting.max}
                                            step={setting.step}
                                            key={setting.name}
                                            className="flex-grow"
                                        />
                                        <Input
                                            type="number"
                                            value={getSetting(setting.name, setting.defaultValue) as number}
                                            onChange={(e) => updateSetting(setting.name, parseInt(e.target.value) || 0)}
                                            className="w-22 ml-4 text-right"
                                        />
                                    </div>
                                </div>
                            );
                        }

                        return null;
                    })}
            </div>
        </section>
    );
};

export default SettingsPanel;
