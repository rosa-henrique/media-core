import type { ButtonHTMLAttributes, ReactNode } from "react";

export type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};
