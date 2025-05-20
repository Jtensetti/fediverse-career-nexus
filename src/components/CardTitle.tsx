
import { CardTitle as ShadcnCardTitle } from "@/components/ui/card";
import { forwardRef } from "react";

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  (props, ref) => {
    return <ShadcnCardTitle {...props} ref={ref} />;
  }
);

CardTitle.displayName = "CardTitle";

export default CardTitle;
