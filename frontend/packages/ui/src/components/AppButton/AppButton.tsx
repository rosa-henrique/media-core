import type { AppButtonProps } from "./AppButton.types";

function AppButton({ children, ...props }: AppButtonProps) {
  return <button {...props}>{children}</button>;
}

export default AppButton;
