import { Box, Container, Typography } from "@mui/material";

export default function AppFooter() {
  return (
    <Box
      component="footer"
      sx={{
        width: "100%",
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          maxWidth: 1440,
          px: { xs: 2, sm: 3, lg: 4 },
          py: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © 2026 Media Core. Todos os direitos reservados.
        </Typography>
      </Container>
    </Box>
  );
}
