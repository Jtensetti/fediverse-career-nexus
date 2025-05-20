
import { Button as ShadcnButton } from "@/components/ui/button";
import { ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";

const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return <ShadcnButton {...props} ref={ref} />;
});

Button.displayName = "Button";

export default Button;
