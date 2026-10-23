/// <reference types="vite/client" />

interface Window {
  __BEESTAT_CONFIG__?: {
    apiBase: string;
    apiKey: string;
    environment: string;
    isDemo: boolean;
    commit: string;
  };
}
