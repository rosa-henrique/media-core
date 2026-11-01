import { CssBaseline, ThemeProvider } from "@mui/material";

import type { ComponentType } from "react";

import { theme } from "../src/theme/theme";

const preview = {
  decorators: [
    (Story: ComponentType) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
