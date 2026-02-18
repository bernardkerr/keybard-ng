import { FC } from "react";

interface Props {
    className?: string;
}

const SquareArrowLeftIcon: FC<Props> = ({ className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
    >
        <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
        />
        <path
            d="m12 8-4 4 4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M16 12H8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export default SquareArrowLeftIcon;
