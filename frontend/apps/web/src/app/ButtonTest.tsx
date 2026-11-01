"use client";

import { AppButton } from "@frontend/ui";

export function ButtonTest() {
  return (
    <AppButton type="button" onClick={() => alert("AppButton funcionando")}>
      Testar AppButton
    </AppButton>
  );
}
