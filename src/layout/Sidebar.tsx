import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { ChevronsLeftRightEllipsis, Cpu, HelpCircle, LucideIcon, Settings, ChevronsRight } from "lucide-react";

import ComboIcon from "@/components/ComboIcon";
import KeyboardIcon from "@/components/icons/Keyboard";
import MacrosIcon from "@/components/icons/MacrosIcon";
import MatrixTesterIcon from "@/components/icons/MatrixTester";
import OverridesIcon from "@/components/icons/Overrides";
import TapdanceIcon from "@/components/icons/Tapdance";
import LayersDefaultIcon from "@/components/icons/LayersDefault";
import Logo from "@/components/Logo";
import { usePanels } from "@/contexts/PanelsContext";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

export type SidebarItem = {
    title: string;
    url: string;
    icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
};

export const primarySidebarItems: SidebarItem[] = [
    { title: "Keys", url: "keyboard", icon: KeyboardIcon },
    { title: "Layers", url: "layers", icon: LayersDefaultIcon },
    { title: "Tapdances", url: "tapdances", icon: TapdanceIcon },
    { title: "Macros", url: "macros", icon: MacrosIcon },
    { title: "Combos", url: "combos", icon: ComboIcon },
    { title: "Overrides", url: "overrides", icon: OverridesIcon },
    { title: "QMK Keys", url: "qmk", icon: Cpu },
    { title: "Misc Keys", url: "misc", icon: ChevronsLeftRightEllipsis },
    { title: "Matrix Tester", url: "matrixtester", icon: MatrixTesterIcon },
];

const footerItems: SidebarItem[] = [
    { title: "About", url: "about", icon: HelpCircle },
    { title: "Settings", url: "settings", icon: Settings },
];

const SidebarNavItem = ({
    item,
    isActive,
    isPreviousPanel,
    isCollapsed,
    alternativeHeader,
    onClick,
}: {
    item: SidebarItem;
    isActive: boolean;
    isPreviousPanel?: boolean;
    isCollapsed: boolean;
    alternativeHeader?: boolean;
    onClick: (item: SidebarItem) => void;
}) => (
    <SidebarMenuItem className="cursor-pointer">
        <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.title}
            sidebarName="primary-nav"
            size="nav"
            className={cn(
                "transition-colors",
                (alternativeHeader ? isPreviousPanel : isActive) ? "text-sidebar-foreground" : "text-gray-400"
            )}
        >
            <button type="button" onClick={() => onClick(item)} className="flex w-full items-center justify-start">
                <div className="w-[43px] h-full flex items-center justify-start pl-[13px] shrink-0">
                    <item.icon className="h-4 w-4 shrink-0" />
                </div>
                <span className="truncate group-data-[state=collapsed]:hidden">
                    {item.title}
                </span>
            </button>
        </SidebarMenuButton>
    </SidebarMenuItem>
);

const SlidingIndicator = ({ index }: { index: number }) => (
    <div
        className="absolute left-[4px] top-0 w-[3px] h-[26px] bg-black z-20 transition-transform duration-300 ease-in-out pointer-events-none"
        style={{ transform: `translateY(${index * 42}px)` }}
    />
);

const AppSidebar = () => {
    const { state, toggleSidebar } = useSidebar("primary-nav", { defaultOpen: false });
    const isCollapsed = state === "collapsed";
    const sidebarClasses = cn(
        "z-11 fixed transition-[box-shadow,border-color] duration-300 ease-out border border-sidebar-border shadow-lg ml-2 h-[98vh] mt-[1vh] transition-all",
        "rounded-3xl"
    );
    const { setItemToEdit, setActivePanel, openDetails, activePanel, panelToGoBack, alternativeHeader, setPanelToGoBack, setAlternativeHeader } = usePanels();

    const handleItemSelect = useCallback(
        (item: SidebarItem) => {
            setActivePanel(item.url);
            openDetails();
            setPanelToGoBack(null);
            setAlternativeHeader(false);
            setItemToEdit(null);
        },
        [openDetails, setActivePanel, setPanelToGoBack, setAlternativeHeader, setItemToEdit]
    );

    const activePrimaryIndex = primarySidebarItems.findIndex((item) => item.url === activePanel);
    const activeFooterIndex = footerItems.findIndex((item) => item.url === activePanel);

    return (
        <Sidebar rounded name="primary-nav" defaultOpen={false} collapsible="icon" hideGap className={sidebarClasses}>
            <SidebarHeader className="p-0 py-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="nav" className="hover:bg-transparent cursor-default">
                            <div className="flex w-full items-center justify-start translate-y-[3px]">
                                <div className="w-[43px] h-4 flex items-center justify-start pl-[10px] shrink-0">
                                    <Logo />
                                </div>
                                <span className="text-xl font-bold truncate group-data-[state=collapsed]:hidden">Keybard</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="nav" className="text-slate-600 transition-colors">
                            <button type="button" onClick={() => toggleSidebar()} className="flex w-full items-center justify-start">
                                <div className="w-[43px] h-4 flex items-center justify-start pl-[13px] shrink-0">
                                    <ChevronsRight className={cn("h-4 w-4 shrink-0 transition-transform", !isCollapsed ? "rotate-180" : "")} />
                                </div>
                                <span className="text-sm font-semibold truncate group-data-[state=collapsed]:hidden">Hide Menu</span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="py-2 !overflow-visible flex flex-col justify-center">
                <SidebarMenu className="relative">
                    {activePrimaryIndex !== -1 && <SlidingIndicator index={activePrimaryIndex} />}
                    {primarySidebarItems.map((item) => (
                        <SidebarNavItem
                            key={item.url}
                            item={item}
                            isActive={activePanel === item.url}
                            isPreviousPanel={panelToGoBack === item.url}
                            isCollapsed={isCollapsed}
                            alternativeHeader={alternativeHeader}
                            onClick={handleItemSelect}
                        />
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-0 py-2 !overflow-visible mb-3">
                <SidebarMenu className="relative">
                    {activeFooterIndex !== -1 && <SlidingIndicator index={activeFooterIndex} />}
                    {footerItems.map((item) => (
                        <SidebarNavItem
                            key={item.url}
                            item={item}
                            isActive={activePanel === item.url}
                            isCollapsed={isCollapsed}
                            onClick={handleItemSelect}
                        />
                    ))}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
};

export default AppSidebar;
