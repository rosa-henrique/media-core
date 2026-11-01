import { createTheme } from "@mui/material/styles";

import { palette } from "./palette";
import { tokens } from "./tokens";
import { typography } from "./typography";

export const theme = createTheme({
  palette,
  typography,
  spacing: tokens.spacing.sm,
  shape: {
    borderRadius: tokens.radius.md,
  },
});
