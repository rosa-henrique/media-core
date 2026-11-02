import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";

import type { ReactNode } from "react";

export const SIDEBAR_WIDTH = 280;

export type NavigationItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

export const navigationItems: NavigationItem[] = [
  {
    label: "Visão geral",
    href: "/",
    icon: <DashboardOutlinedIcon />,
  },
  {
    label: "Vídeos",
    href: "/videos",
    icon: <VideoLibraryOutlinedIcon />,
  },
  {
    label: "Notícias",
    href: "/noticias",
    icon: <ArticleOutlinedIcon />,
  },
  {
    label: "Categorias",
    href: "/categorias",
    icon: <CategoryOutlinedIcon />,
  },
  {
    label: "Usuários",
    href: "/usuarios",
    icon: <PeopleAltOutlinedIcon />,
  },
  {
    label: "Configurações",
    href: "/configuracoes",
    icon: <SettingsOutlinedIcon />,
  },
];
