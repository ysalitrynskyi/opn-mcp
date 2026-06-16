# opn-mcp

An [MCP](https://modelcontextprotocol.io) server for **[opn.onl](https://opn.onl)** — the open-source, self-hostable URL shortener. It lets AI assistants (Claude Desktop, Cursor, etc.) shorten links, read analytics, generate QR codes, and manage links in natural language.

Works against the hosted service **or your own self-hosted instance**.

## Setup

### 1. Get an API key

On your opn.onl instance, go to **Settings → API Keys**, create a key, and copy it (it starts with `opn_` and is shown once).

### 2. Add the server to your MCP client

**Claude Desktop** — edit `claude_desktop_config.json` (`~/Library/Application Support/Claude/` on macOS, `%APPDATA%\Claude\` on Windows):

```json
{
  "mcpServers": {
    "opn": {
      "command": "npx",
      "args": ["-y", "opn-mcp"],
      "env": {
        "OPN_API_KEY": "opn_your_key_here"
      }
    }
  }
}
```

Restart your client. That's it — it talks to the hosted API (`https://l.opn.onl`) by default.

> Not published to npm yet? Use the GitHub source instead — same config, just swap the `args`:
> `"args": ["-y", "github:ysalitrynskyi/opn-mcp"]` (it builds on install).

### Self-hosted instance

Point `OPN_BASE_URL` at your own instance's API host:

```json
{
  "mcpServers": {
    "opn": {
      "command": "npx",
      "args": ["-y", "opn-mcp"],
      "env": {
        "OPN_API_KEY": "opn_your_key_here",
        "OPN_BASE_URL": "https://l.your-domain.com"
      }
    }
  }
}
```

## Configuration

| Env var | Required | Default | Description |
|---------|----------|---------|-------------|
| `OPN_API_KEY` | ✅ | — | Your API key (`opn_…`), from Settings → API Keys |
| `OPN_BASE_URL` | — | `https://l.opn.onl` | API base URL — set this for a self-hosted instance |

## Tools

| Tool | Description |
|------|-------------|
| `shorten_url` | Create a short link (url, optional alias / title / expiry / password) |
| `list_links` | List your links (limit, offset, search) |
| `get_link_stats` | Click analytics for a link (geo, devices, browsers, referrers) |
| `update_link` | Update a link's destination, title, expiry or password |
| `delete_link` | Delete a link |
| `get_qr_code` | Get a link's QR image — optional brand colour, centre logo, PNG/SVG |
| `check_url_health` | Check a destination URL is reachable before shortening |

## Example prompts

- "Shorten https://example.com/very/long/url and call it launch-2026"
- "How many clicks did link 42 get, and from which countries?"
- "Give me a branded SVG QR code for link 42"
- "List my last 10 links"

## Development

```bash
npm install
npm run build      # tsc → dist/
npm test           # vitest
OPN_API_KEY=opn_… npm run dev   # run from source (stdio)
```

## License

MIT © ysalitrynskyi. Part of the [opn.onl](https://github.com/ysalitrynskyi/opn.onl) project.
