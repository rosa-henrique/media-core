"use client";

import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import { AppBar, Avatar, Box, IconButton, Toolbar, Typography } from "@mui/material";

export default function AppHeader() {
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Toolbar sx={{ minHeight: "64px !important", px: { xs: 2, md: 3 } }}>
        <Typography variant="h6" component="h1" color="text.primary" sx={{ flexGrow: 1 }}>
          Administração
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton color="inherit" aria-label="Notificações">
            <NotificationsNoneOutlinedIcon />
          </IconButton>

          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontSize: 14,
            }}
          >
            A
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
