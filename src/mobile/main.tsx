import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import "@/styles.css";

import { MobileBootstrap } from "./mobile-bootstrap";
import "./mobile.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
});

const container = document.getElementById("root");

if (!container) throw new Error("Elemento raiz do aplicativo móvel não encontrado.");

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MobileBootstrap />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  </StrictMode>,
);
