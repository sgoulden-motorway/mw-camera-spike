import React, { ForwardedRef } from "react";

const Document = React.forwardRef<SVGSVGElement, { className: string }>(
  ({ className }, ref: ForwardedRef<SVGSVGElement>) => {
    return (
      <svg
        viewBox="0 0 300 80"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        fillRule="evenodd"
        clipRule="evenodd"
        className={className}
        ref={ref}
      >
        <path d="M22 24h-20v-24h14l6 6v18zm-7-23h-12v22h18v-16h-6v-6zm3 15v1h-12v-1h12zm0-3v1h-12v-1h12zm0-3v1h-12v-1h12zm-2-4h4.586l-4.586-4.586v4.586z" />
      </svg>
    );
  }
);

Document.displayName = "Document";
export default Document;
