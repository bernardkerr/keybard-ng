import { FC } from "react";

interface Props {
    className?: string;
}

const MiniZapDefaultIcon: FC<Props> = ({ className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
    >
        <path d="M12,4.42c-4.19,0-7.58,3.39-7.58,7.58s3.39,7.58,7.58,7.58,7.58-3.39,7.58-7.58-3.39-7.58-7.58-7.58ZM15.71,12.71l-4,4c-.2.19-.45.29-.71.29s-.51-.1-.71-.29c-.39-.39-.39-1.03,0-1.42l2.3-2.29h-3.59c-.4,0-.77-.24-.92-.62-.16-.37-.07-.8.21-1.09l4-4c.39-.39,1.03-.39,1.42,0,.39.39.39,1.03,0,1.42l-2.3,2.29h3.59c.4,0,.77.24.92.62.16.37.07.8-.21,1.09Z" />
        <circle
            cx="12"
            cy="12"
            r="10.29"
            transform="translate(-1.77 21.92) rotate(-80.78)"
            fill="none"
            stroke="currentColor"
            strokeMiterlimit="10"
            strokeWidth="1.5"
        />
    </svg>
);

export default MiniZapDefaultIcon;
