import React from "react";
import { createRoot } from "react-dom/client";

import App from "~/App";
import { shouldLoadAnalytics } from "~/util/analytics";

// eslint-disable-next-line import/no-unassigned-import
import "@fontsource/inter";
// eslint-disable-next-line import/no-unassigned-import
import "~/monaco";
import "~/assets/style/global.css";
import "reactflow/dist/style.css";

// Umami analytics, loaded directly from the analytics host when configured.
// (The old Next.js middleware proxied and anonymised this; a static SPA can't.)
const umamiSite = import.meta.env.VITE_UMAMI_SITE as string | undefined;
if (umamiSite && shouldLoadAnalytics(new URL(location.href))) {
  const script = document.createElement("script");
  const host = (import.meta.env.VITE_UMAMI_HOST as string | undefined) ?? "";

  script.defer = true;
  script.dataset.websiteId = umamiSite;
  script.src = `${host}/script.js`;
  document.head.appendChild(script);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
