import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/simulador-sinais-sistemas/", // <-- Coloque o nome exato do seu repositório aqui
});
