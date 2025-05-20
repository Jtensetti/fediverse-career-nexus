
import { CardHeader as ShadcnCardHeader } from "@/components/ui/card";
import { forwardRef } from "react";

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return <ShadcnCardHeader {...props} ref={ref} />;
  }
);

CardHeader.displayName = "CardHeader";

export default CardHeader;
