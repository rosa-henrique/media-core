"use client";

import { Box, Drawer } from "@mui/material";

import type { ReactNode } from "react";

import AppFooter from "./AppFooter";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import ContentWrapper from "./ContentWrapper";
import { SIDEBAR_WIDTH } from "./navigation";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Drawer
        variant="permanent"
        open
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          },
        }}
      >
        <AppSidebar onNavigate={() => undefined} />
      </Drawer>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minWidth: 0,
          minHeight: "100vh",
        }}
      >
        <AppHeader />

        <ContentWrapper>{children}</ContentWrapper>

        <AppFooter />
      </Box>
    </Box>
  );
}
