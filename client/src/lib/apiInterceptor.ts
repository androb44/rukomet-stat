// Patches window.fetch so /api/* requests fall back to a localStorage-backed
// mock when the deployed environment has no real backend (e.g. Cloudflare
// Pages serving only static assets — every /api/* hits the SPA fallback and
// returns index.html). Probes the backend on the first /api/* call and
// caches the result.

import { handleLocalRequest, isApiPath } from "./localApi";

type BackendState = "unknown" | "live" | "missing";
let backendState: BackendState = "unknown";

const realFetch = window.fetch.bind(window);

function looksLikeJson(res: Response): boolean {
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json");
}

async function tryRealApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  try {
    const res = await realFetch(input, init);
    // SPA fallback returns 200 with text/html — treat anything non-JSON as
    // "no backend" so we don't try to parse HTML as a Team list.
    if (res.ok && !looksLikeJson(res)) return null;
    return res;
  } catch {
    return null;
  }
}

async function readBody(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  const body = init?.body ?? (input instanceof Request ? await input.clone().text() : undefined);
  if (body == null || body === "") return undefined;
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch { return body; }
  }
  return body;
}

function resolveUrl(input: RequestInfo | URL): URL {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  return new URL(raw, window.location.origin);
}

window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = resolveUrl(input);
  if (url.origin !== window.location.origin || !isApiPath(url.pathname)) {
    return realFetch(input, init);
  }

  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

  if (backendState === "missing") {
    const body = await readBody(input, init);
    const local = await handleLocalRequest(method, url, body);
    return local ?? realFetch(input, init);
  }

  if (backendState === "live") {
    return realFetch(input, init);
  }

  // Unknown — probe by making the real request once and inspecting the response.
  const real = await tryRealApi(input, init);
  if (real) {
    backendState = "live";
    return real;
  }

  backendState = "missing";
  if (typeof console !== "undefined") {
    console.info("[rukomet-stat] No backend detected — using local in-browser storage for /api/*.");
  }
  const body = await readBody(input, init);
  const local = await handleLocalRequest(method, url, body);
  return local ?? new Response(JSON.stringify({ message: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
};
