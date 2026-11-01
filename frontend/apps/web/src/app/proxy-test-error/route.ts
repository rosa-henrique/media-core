export function GET() {
  return Response.json(
    {
      error: "Erro 500 simulado para teste do proxy",
    },
    {
      status: 500,
    },
  );
}
