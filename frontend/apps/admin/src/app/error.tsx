"use client";

import { useEffect } from "react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Registra o erro para diagnóstico no ambiente do navegador.
    // O monitoramento centralizado pode ser integrado futuramente.
  }, []);

  return (
    <main>
      <h1>Algo deu errado</h1>

      <p>Ocorreu um erro inesperado. Tente novamente.</p>

      <button onClick={() => reset()}>Tentar novamente</button>
    </main>
  );
}
