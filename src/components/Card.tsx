
import { Card as ShadcnCard } from "@/components/ui/card";
import { forwardRef } from "react";

const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return <ShadcnCard {...props} ref={ref} />;
  }
);

Card.displayName = "Card";

export default Card;
