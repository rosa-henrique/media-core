import type { ThemeOptions } from "@mui/material/styles";

export const colorSchemes = {
  light: {
    palette: {
      primary: {
        main: "#2563EB",
        light: "#60A5FA",
        dark: "#1D4ED8",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#64748B",
        light: "#94A3B8",
        dark: "#475569",
        contrastText: "#FFFFFF",
      },
      error: { main: "#DC2626" },
      warning: { main: "#D97706" },
      info: { main: "#0284C7" },
      success: { main: "#16A34A" },
      background: {
        default: "#F8FAFC",
        paper: "#FFFFFF",
      },
      text: {
        primary: "#0F172A",
        secondary: "#475569",
        disabled: "#94A3B8",
      },
      divider: "#E2E8F0",
    },
  },
  dark: {
    palette: {
      primary: {
        main: "#60A5FA",
        light: "#93C5FD",
        dark: "#2563EB",
        contrastText: "#0F172A",
      },
      secondary: {
        main: "#94A3B8",
        light: "#CBD5E1",
        dark: "#64748B",
        contrastText: "#0F172A",
      },
      error: { main: "#F87171" },
      warning: { main: "#FBBF24" },
      info: { main: "#38BDF8" },
      success: { main: "#4ADE80" },
      background: {
        default: "#0F172A",
        paper: "#1E293B",
      },
      text: {
        primary: "#F1F5F9",
        secondary: "#CBD5E1",
        disabled: "#64748B",
      },
      divider: "rgba(255, 255, 255, 0.12)",
    },
  },
} satisfies NonNullable<ThemeOptions["colorSchemes"]>;
