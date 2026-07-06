import { forwardRef } from "react";

const Box = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
    function Box({ children, className }, ref) {
        return (
            <div ref={ref} className={`bg-white rounded-2xl p-4 ${className}`}>
                {children}
            </div>
        );
    },
);

export default Box;
