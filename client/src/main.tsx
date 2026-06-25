
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

  // Capture the prompt early only on the teacher portal, where the custom
  // "Download App" button later calls prompt().
  window.addEventListener('beforeinstallprompt', (event) => {
    if (window.location.pathname !== '/teacher-portal') {
      return;
    }

    event.preventDefault();
    window.__mmpnsDeferredInstallPrompt = event as BeforeInstallPromptEvent;
  });

  window.addEventListener('appinstalled', () => {
    window.__mmpnsDeferredInstallPrompt = null;
  });

  const removeBootLoader = () => {
    const loader = document.getElementById('boot-portal-loader');
    if (!loader) return;

    loader.classList.add('boot-loader--hidden');
    window.setTimeout(() => {
      loader.remove();
    }, 240);
  };

  registerSW({ immediate: true });

  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );

  window.requestAnimationFrame(() => {
    window.setTimeout(removeBootLoader, 120);
  });
