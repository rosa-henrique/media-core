import { Box, Container } from "@mui/material";

import type { ReactNode } from "react";

type ContentWrapperProps = {
  children: ReactNode;
};

export default function ContentWrapper({ children }: ContentWrapperProps) {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        width: "100%",
        minWidth: 0,
        py: { xs: 2, md: 3 },
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          width: "100%",
          maxWidth: 1440,
          px: { xs: 2, sm: 3, lg: 4 },
        }}
      >
        {children}
      </Container>
    </Box>
  );
}
