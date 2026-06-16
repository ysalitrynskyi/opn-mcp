import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadConfig, OpnClient, qs, DEFAULT_BASE_URL, OpnApiError } from "./client.js";

describe("loadConfig", () => {
  it("requires an API key", () => {
    expect(() => loadConfig({})).toThrow(/OPN_API_KEY/);
  });

  it("defaults the base URL to the hosted service", () => {
    const c = loadConfig({ OPN_API_KEY: "opn_x" });
    expect(c.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(c.apiKey).toBe("opn_x");
  });

  it("honors a self-hosted base URL and strips trailing slashes", () => {
    const c = loadConfig({ OPN_API_KEY: "opn_x", OPN_BASE_URL: "https://links.example.com//" });
    expect(c.baseUrl).toBe("https://links.example.com");
  });
});

describe("qs", () => {
  it("builds a query string, skipping empty/undefined", () => {
    expect(qs({ a: 1, b: undefined, c: "", d: "x" })).toBe("?a=1&d=x");
    expect(qs({})).toBe("");
  });
});

describe("OpnClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the bearer key and parses JSON", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new OpnClient({ baseUrl: "https://api.test", apiKey: "opn_secret" });
    const res = await client.get<{ ok: boolean }>("/links");

    expect(res).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/links");
    expect(init.headers).toMatchObject({ Authorization: "Bearer opn_secret" });
  });

  it("throws OpnApiError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 401 })),
    );
    const client = new OpnClient({ baseUrl: "https://api.test", apiKey: "k" });
    await expect(client.get("/links")).rejects.toBeInstanceOf(OpnApiError);
  });
});
