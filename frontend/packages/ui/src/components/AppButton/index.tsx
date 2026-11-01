import type { ButtonHTMLAttributes, ReactNode } from "react";

export type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function AppButton({ children, ...props }: AppButtonProps) {
  return <button {...props}>{children}</button>;
}
