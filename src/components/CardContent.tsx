
import { CardContent as ShadcnCardContent } from "@/components/ui/card";
import { forwardRef } from "react";

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return <ShadcnCardContent {...props} ref={ref} />;
  }
);

CardContent.displayName = "CardContent";

export default CardContent;
