"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";

import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import { navigationItems } from "./navigation";

type AppSidebarProps = {
  onNavigate: () => void;
};

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box
        sx={{
          minHeight: 64,
          display: "flex",
          alignItems: "center",
          px: 3,
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            display: "grid",
            placeItems: "center",
            borderRadius: 2,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            fontWeight: 700,
          }}
        >
          M
        </Box>

        <Typography variant="h6" color="text.primary">
          Media Core
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ flexGrow: 1, overflowY: "auto", px: 2, py: 2 }}>
        <Typography variant="overline" color="text.secondary" sx={{ px: 1.5 }}>
          Menu principal
        </Typography>

        <List disablePadding sx={{ mt: 1 }}>
          {navigationItems.map((item) => {
            const selected =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <ListItemButton
                key={item.href}
                component={NextLink}
                href={item.href}
                selected={selected}
                onClick={onNavigate}
                sx={{
                  minHeight: 44,
                  mb: 0.5,
                  px: 1.5,
                  borderRadius: 1.5,
                  color: selected ? "primary.main" : "text.secondary",
                  "& .MuiListItemIcon-root": {
                    color: "inherit",
                    minWidth: 40,
                  },
                  "&.Mui-selected": {
                    bgcolor: "action.selected",
                  },
                  "&.Mui-selected:hover": {
                    bgcolor: "action.selected",
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>

                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      variant: "body2",
                      sx: {
                        fontWeight: selected ? 600 : 500,
                      },
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Divider />

      <Box sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Media Core Admin
        </Typography>
      </Box>
    </Box>
  );
}
