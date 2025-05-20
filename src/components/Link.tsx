
import { Link as RouterLink, LinkProps as RouterLinkProps } from "react-router-dom";
import { forwardRef } from "react";

interface LinkProps extends RouterLinkProps {
  children: React.ReactNode;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ children, ...props }, ref) => {
    return (
      <RouterLink {...props} ref={ref}>
        {children}
      </RouterLink>
    );
  }
);

Link.displayName = "Link";

export default Link;
