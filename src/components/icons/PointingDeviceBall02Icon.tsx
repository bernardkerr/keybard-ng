import { FC } from "react";

interface Props {
    className?: string;
}

const PointingDeviceBall02Icon: FC<Props> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17.84,8.46c.52,1.49-1.17,3.22-2.2,1.95s-2.18-1.94-3.46-2.57c-1.75-.87-.39-2.87,1.87-2.54s3.33,1.8,3.8,3.15Z" fill="white" />
    </svg>
);

export default PointingDeviceBall02Icon;
