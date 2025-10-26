export const layerColors = [
    { name: "green", hex: "#099e7c" },
    { name: "blue", hex: "#379cd7" },
    { name: "purple", hex: "#8672b5" },
    { name: "orange", hex: "#f89804" },
    { name: "yellow", hex: "#ffc222" },
    { name: "grey", hex: "#85929b" },
    { name: "red", hex: "#d8304a" },
    { name: "brown", hex: "#b39369" },
];

// function to get color by name
export function getColorByName(name: string) {
    return layerColors.find((color) => color.name === name);
}

export function getClassNameByColor(name: string) {
    return `bg-kb-${name}`;
}

export const colorClasses: { [key: string]: string } = {
    primary: "bg-kb-primary",
    red: "bg-kb-red",
    green: "bg-kb-green",
    blue: "bg-kb-blue",
    yellow: "bg-kb-yellow",
    orange: "bg-kb-orange",
    purple: "bg-kb-purple",
    grey: "bg-kb-grey",
    brown: "bg-kb-brown",
};
