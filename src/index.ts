#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { OpnClient, loadConfig, qs, DEFAULT_BASE_URL } from "./client.js";

// Build the client lazily so the server boots — and answers `initialize` +
// `tools/list` — WITHOUT any API key. Secrets are only needed when a tool is
// actually called. Registries (Glama, the official registry) introspect the
// server with no env set, so booting must never require a key.
let cached: OpnClient | null = null;
function client(): OpnClient {
  if (!cached) cached = new OpnClient(loadConfig());
  return cached;
}

function text(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorText(e: unknown) {
  return {
    content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
    isError: true,
  };
}

async function main(): Promise<void> {
  const server = new McpServer({ name: "opn-mcp", version: "1.1.0" });

  server.tool(
    "shorten_url",
    "Create a short link on opn.onl. Returns the short URL and its code.",
    {
      url: z.string().url().describe("The destination URL to shorten"),
      alias: z.string().optional().describe("Custom alias / slug (optional)"),
      title: z.string().optional().describe("Private title for the link (optional)"),
      expires_at: z.string().optional().describe("ISO-8601 expiry timestamp (optional)"),
      password: z.string().optional().describe("Password-protect the link (optional)"),
    },
    async (args) => {
      try {
        return text(
          await client().post("/links", {
            original_url: args.url,
            custom_alias: args.alias,
            title: args.title,
            expires_at: args.expires_at,
            password: args.password,
          }),
        );
      } catch (e) {
        return errorText(e);
      }
    },
  );

  server.tool(
    "list_links",
    "List your short links (most recent first).",
    {
      limit: z.number().int().min(1).max(100).optional().describe("Max links to return (default 20)"),
      offset: z.number().int().min(0).optional().describe("Pagination offset"),
      search: z.string().optional().describe("Filter by text in the URL, title, notes or code"),
    },
    async (args) => {
      try {
        return text(
          await client().get(`/links${qs({ limit: args.limit, offset: args.offset, search: args.search })}`),
        );
      } catch (e) {
        return errorText(e);
      }
    },
  );

  server.tool(
    "get_link_stats",
    "Get click analytics for a link (clicks, geography, devices, browsers, referrers).",
    { id: z.number().int().describe("The link id") },
    async (args) => {
      try {
        return text(await client().get(`/links/${args.id}/stats`));
      } catch (e) {
        return errorText(e);
      }
    },
  );

  server.tool(
    "update_link",
    "Update a link's destination, title, expiry or password.",
    {
      id: z.number().int().describe("The link id"),
      url: z.string().url().optional().describe("New destination URL"),
      title: z.string().optional(),
      expires_at: z.string().optional().describe("New ISO-8601 expiry timestamp"),
      password: z.string().optional().describe("New password"),
    },
    async (args) => {
      try {
        return text(
          await client().put(`/links/${args.id}`, {
            original_url: args.url,
            title: args.title,
            expires_at: args.expires_at,
            password: args.password,
          }),
        );
      } catch (e) {
        return errorText(e);
      }
    },
  );

  server.tool(
    "delete_link",
    "Delete a short link.",
    { id: z.number().int().describe("The link id") },
    async (args) => {
      try {
        await client().del(`/links/${args.id}`);
        return text(`Link ${args.id} deleted.`);
      } catch (e) {
        return errorText(e);
      }
    },
  );

  server.tool(
    "get_qr_code",
    "Get the QR code for a link, optionally branded with a colour, centre logo, and PNG/SVG format.",
    {
      id: z.number().int().describe("The link id"),
      color: z.string().optional().describe("Hex foreground colour, e.g. 2f37d8"),
      logo: z.boolean().optional().describe("Overlay the brand logo in the centre"),
      format: z.enum(["png", "svg"]).optional().describe("Image format (default png)"),
    },
    async (args) => {
      try {
        const query = qs({
          color: args.color?.replace(/^#/, ""),
          logo: args.logo ? "true" : undefined,
          format: args.format && args.format !== "png" ? args.format : undefined,
        });
        const { base64, mimeType } = await client().getBinary(`/links/${args.id}/qr${query}`);
        if (mimeType.includes("svg")) {
          return text(Buffer.from(base64, "base64").toString("utf8"));
        }
        return { content: [{ type: "image" as const, data: base64, mimeType }] };
      } catch (e) {
        return errorText(e);
      }
    },
  );

  server.tool(
    "check_url_health",
    "Check whether a destination URL is reachable (status + timing) before shortening it.",
    { url: z.string().url().describe("The URL to check") },
    async (args) => {
      try {
        return text(await client().post("/links/health-check", { url: args.url }));
      } catch (e) {
        return errorText(e);
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is the MCP transport — log to stderr only.
  console.error(`opn-mcp ready (base: ${process.env.OPN_BASE_URL?.trim() || DEFAULT_BASE_URL})`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
