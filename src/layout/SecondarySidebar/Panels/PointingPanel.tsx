import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useLayoutSettings } from "@/contexts/LayoutSettingsContext";
import { useSettings } from "@/contexts/SettingsContext";

const POINTING_SETTINGS = [
    "left-dpi",
    "right-dpi",
    "scroll-right",
    "scroll-left",
    "auto-mouse",
    "auto-mouse-timeout",
    "fix-drift",
];

const PointingPanel = () => {
    const { getSetting, updateSetting, settingsDefinitions } = useSettings();
    const { layoutMode } = useLayoutSettings();

    const isHorizontal = layoutMode === "bottombar";

    // Horizontal layout for bottom panel
    if (isHorizontal) {
        return (
            <div className="flex flex-row gap-3 h-full items-start flex-wrap content-start">
                {POINTING_SETTINGS.map((settingName) => {
                    const setting = settingsDefinitions.find((s) => s.name === settingName);
                    if (!setting) return null;

                    if (setting.type === "boolean") {
                        return (
                            <div key={setting.name} className="flex flex-col gap-1 min-w-[80px]">
                                <span className="text-[9px] font-bold text-slate-500 uppercase truncate">{setting.label}</span>
                                <Switch
                                    checked={getSetting(setting.name, setting.defaultValue) as boolean}
                                    onCheckedChange={(checked) => updateSetting(setting.name, checked)}
                                />
                            </div>
                        );
                    }

                    if (setting.type === "slider") {
                        return (
                            <div key={setting.name} className="flex flex-col gap-1 min-w-[100px]">
                                <span className="text-[9px] font-bold text-slate-500 uppercase truncate">{setting.label}</span>
                                <div className="flex items-center gap-1">
                                    <Slider
                                        value={[getSetting(setting.name, setting.defaultValue) as number]}
                                        onValueChange={(values) => updateSetting(setting.name, values[0])}
                                        min={setting.min}
                                        max={setting.max}
                                        step={setting.step}
                                        className="w-16"
                                    />
                                    <Input
                                        type="number"
                                        value={getSetting(setting.name, setting.defaultValue) as number}
                                        onChange={(e) => updateSetting(setting.name, parseInt(e.target.value) || 0)}
                                        className="w-14 h-6 text-xs text-right p-1"
                                    />
                                </div>
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        );
    }

    return (
        <section className="space-y-3 h-full max-h-full flex flex-col w-full mx-auto py-4">
            <div className="flex flex-col overflow-auto flex-grow gap-2">
                {POINTING_SETTINGS.map((settingName) => {
                    const setting = settingsDefinitions.find((s) => s.name === settingName);
                    if (!setting) return null;

                    if (setting.type === "boolean") {
                        return (
                            <div className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item group/item" key={setting.name}>
                                <div className="flex flex-col items-start gap-3">
                                    <span className="text-md text-left">{setting.label}</span>
                                    {setting.description && <span className="text-xs text-muted-foreground">{setting.description}</span>}
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

                    if (setting.type === "slider") {
                        return (
                            <div className="flex flex-col gap-2 p-3 panel-layer-item group/item w-full" key={setting.name}>
                                <span className="text-md text-left">{setting.label}</span>
                                {setting.description && <span className="text-xs text-muted-foreground">{setting.description}</span>}
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

                    if (setting.type === "action") {
                        return (
                            <div
                                className="flex flex-row items-center justify-between p-3 gap-3 panel-layer-item group/item cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
                                key={setting.name}
                                onClick={() => {
                                    console.log(`Action ${setting.action} triggered`);
                                    // Handle fix-drift action if needed
                                }}
                            >
                                <div className="flex flex-col gap-2">
                                    <span className="text-md text-left">{setting.label}</span>
                                    {setting.description && <span className="text-xs text-muted-foreground">{setting.description}</span>}
                                </div>
                                <span className="text-xs text-muted-foreground">›</span>
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </section>
    );
};

export default PointingPanel;
