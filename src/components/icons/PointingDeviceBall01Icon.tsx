import { FC } from "react";

interface Props {
    className?: string;
}

const PointingDeviceBall01Icon: FC<Props> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17.91,9.13c.59,2.12-1.09,3.91-2.31,1.42-.61-1.24-2.22-2.34-3.38-2.62-2.21-.52-1.1-2.72,1.76-2.23,2.25.38,3.54,2.04,3.93,3.42Z" fill="currentColor" />
    </svg>
);

export default PointingDeviceBall01Icon;
