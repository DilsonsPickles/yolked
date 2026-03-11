import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkOnly } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Never cache Supabase auth requests — always go to network
    {
      matcher: ({ url }) =>
        url.pathname.includes("/auth/") ||
        url.hostname.includes("supabase"),
      handler: new NetworkOnly(),
    },
    // Default caching for everything else
    ...defaultCache,
  ],
});

serwist.addEventListeners();
