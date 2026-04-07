
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { registerSW } from "virtual:pwa-register";
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }

  declare global {
    interface Window {
      __mmpnsDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
    }
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  // Capture install prompt as early as possible so page-level components don't miss it.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.__mmpnsDeferredInstallPrompt = event as BeforeInstallPromptEvent;
  });

  window.addEventListener('appinstalled', () => {
    window.__mmpnsDeferredInstallPrompt = null;
  });

  registerSW({ immediate: true });

  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
  