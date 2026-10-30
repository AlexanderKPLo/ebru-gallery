// Ebru's First Exhibition: the Worker in front of the website files.
// Everything is served from the static files; only /api/... runs code (titles and notes, saved in KV).
import { handleApi } from "./api.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url.pathname.slice(5).replace(/\/+$/, ""));
    }
    return env.ASSETS.fetch(request);
  },
};
