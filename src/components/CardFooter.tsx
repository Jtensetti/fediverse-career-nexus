
import { CardFooter as ShadcnCardFooter } from "@/components/ui/card";
import { forwardRef } from "react";

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return <ShadcnCardFooter {...props} ref={ref} />;
  }
);

CardFooter.displayName = "CardFooter";

export default CardFooter;
