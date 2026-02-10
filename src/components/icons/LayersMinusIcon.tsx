import React from "react";

interface LayersMinusIconProps {
    className?: string;
}

const LayersMinusIcon: React.FC<LayersMinusIconProps> = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12.83,2.18c-.53-.24-1.13-.24-1.66,0L2.6,6.08c-.51.22-.73.81-.51,1.32.1.23.28.41.51.51l8.58,3.91c.26.12.54.18.83.18.29,0,.57-.06.83-.18l8.58-3.9c.51-.22.74-.81.51-1.32-.1-.23-.28-.41-.51-.51l-8.59-3.91Z" />
        <path d="M16,17h6" />
        <path d="M2,12c0,.39.23.75.58.91l8.6,3.91c.26.12.54.18.82.18" />
        <path d="M2,17c0,.39.23.75.58.91l8.6,3.91c.52.24,1.13.24,1.65,0l2.12-.96" />
    </svg>
);

export default LayersMinusIcon;
