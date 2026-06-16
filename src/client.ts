/**
 * Thin client for the opn.onl HTTP API. Works against the hosted service
 * (https://l.opn.onl) or any self-hosted instance via OPN_BASE_URL.
 */

export const DEFAULT_BASE_URL = "https://l.opn.onl";

export interface OpnConfig {
  baseUrl: string;
  apiKey: string;
}

/** Read + validate config from the environment. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): OpnConfig {
  const apiKey = env.OPN_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPN_API_KEY is required. Create one under Settings → API Keys on your opn.onl instance.",
    );
  }
  const baseUrl = (env.OPN_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return { baseUrl, apiKey };
}

export class OpnApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "OpnApiError";
  }
}

export class OpnClient {
  constructor(private readonly config: OpnConfig) {}

  private url(path: string): string {
    return `${this.config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  private authHeader(): Record<string, string> {
    return { Authorization: `Bearer ${this.config.apiKey}` };
  }

  private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method,
      headers: {
        ...this.authHeader(),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new OpnApiError(
        res.status,
        `opn.onl API ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 300)}` : ""}`,
      );
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (res.status === 204 || !contentType) return undefined as T;
    return (contentType.includes("application/json") ? await res.json() : await res.text()) as T;
  }

  get<T = unknown>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }
  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }
  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }
  del<T = unknown>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  /** Fetch a binary resource (e.g. a QR image) as base64 + mime type. */
  async getBinary(path: string): Promise<{ base64: string; mimeType: string }> {
    const res = await fetch(this.url(path), { headers: this.authHeader() });
    if (!res.ok) {
      throw new OpnApiError(res.status, `opn.onl API ${res.status} ${res.statusText}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      base64: buf.toString("base64"),
      mimeType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  }
}

/** Build a query string from defined params (skips undefined/empty). */
export function qs(params: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}
