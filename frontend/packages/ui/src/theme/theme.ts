import { createTheme } from "@mui/material/styles";

import { colorSchemes } from "./palette";
import { tokens } from "./tokens";
import { typography } from "./typography";

export const theme = createTheme({
  colorSchemes,
  cssVariables: {
    colorSchemeSelector: "class",
  },
  typography,
  spacing: tokens.spacing.sm,
  shape: {
    borderRadius: tokens.radius.md,
  },
});
