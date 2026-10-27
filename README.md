# Memo no Sekai

A quiet, local-first notebook. Write in Markdown, find anything with structured
search, and keep the private entries encrypted on your own device.

By default nothing leaves the browser. There is no account, no telemetry and no
server-side copy of your writing unless you deliberately configure one.

---

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No configuration is required.

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Development server with hot reload                  |
| `npm run build`     | Production build                                    |
| `npm start`         | Serve the production build                          |
| `npm test`          | Unit tests                                          |
| `npm run lint`      | ESLint, zero warnings allowed                       |
| `npm run typecheck` | TypeScript, no emit                                 |
| `npm run format`    | Prettier, write                                     |
| `npm run verify`    | Everything above, in the order CI runs it           |

---

## Where your memos are kept

This is the design decision that shapes everything else, so it is worth stating
plainly.

**Device storage (the default).** Memos are written to IndexedDB in your
browser. They survive reloads, work offline, and are never transmitted. Because
they are tied to one browser profile, they do not follow you to another device —
use **Export a backup** in settings to move them.

IndexedDB is used rather than `localStorage` because a memo with an embedded
image easily exceeds the roughly 5 MB that `localStorage` allows, and a rejected
write there would silently cost you an edit. If IndexedDB is unavailable — a
locked-down browser, a private window — the app falls back to `localStorage` and
tells you so in a banner.

**Shared database (opt in).** Set `DATABASE_URL` and the same workspace is
served to every device that has the sync passphrase. See
[Syncing across devices](#syncing-across-devices).

Either way, a memo you have protected with a password is encrypted in the
browser first. The plaintext never reaches storage of any kind.

---

## What it does

### Writing

- Markdown with live preview: headings, bold, italic, strikethrough, inline and
  fenced code, blockquotes, rules, bullet, numbered and task lists
- Formatting shortcuts for bold, italic, link and list
- Clickable task checkboxes in preview that write `[x]` back into the memo
- Undo and redo per memo, plus up to 20 local revisions you can restore
- Inline images up to 2 MB, pasted or dropped, stored inside the memo
- `[[Memo title]]` links with autocomplete, resolved both ways as backlinks
- Focus mode, word count, and a per-memo colour

### Capturing

- Quick capture dialog for a thought you do not want to lose
- Web link capture that saves a URL with your own note attached
- Daily, meeting and project templates, plus any memo saved as a custom template
- Share target: on an installed app, share a link or text from elsewhere on the
  device straight into capture

### Finding

Search accepts plain words, `"quoted phrases"`, and structured tokens. Prefix
any token with `-` to exclude it.

| Token                            | Matches                                               |
| -------------------------------- | ----------------------------------------------------- |
| `tag:work`                       | the tag and anything nested under it, like `work/api` |
| `folder:personal`                | memos in that folder                                   |
| `title:plan` / `content:budget`  | that field only                                        |
| `date:today`                     | also `yesterday`, `week`, `month`, `2026-10-04`       |
| `due:week`                       | the same keywords, against the due date                |
| `is:favorite`                    | also `pinned`, `archived`, `trashed`                   |
| `is:protected`                   | also `unprotected`                                     |
| `is:task`                        | also `open`, `completed`                               |
| `is:overdue`                     | also `upcoming`                                        |

Save any query as a view and it appears in the sidebar. Sort by updated, due,
title or created.

### Organising

Folders, tags with nesting, favourites, pins, archive and a restorable trash.
Select several memos to tag, move, favourite, pin, archive, trash or export them
together. An Upcoming list and a month calendar cover anything with a due date,
and a task board groups checklist memos by progress.

### Protecting a memo

A protected memo is encrypted in the browser with AES-GCM, under a key derived
from your password with PBKDF2-SHA256 at 600,000 iterations. You receive a
one-time recovery code when you protect it; it is the only other way in.

The password is never stored. Neither is the plaintext: it is kept in memory for
the unlocked session only, and is excluded from the device copy, the database,
every export and the revision history.

### Getting your writing out

Portable JSON backups carry memos, folders, saved views and templates, and
import again cleanly, including from older exports. There is also a plain-text
export and a privacy-safe analytics report.

### Shortcuts

| Keys            | Action                            |
| --------------- | --------------------------------- |
| `Cmd/Ctrl + K`  | Command palette                   |
| `Cmd/Ctrl + N`  | New memo                          |
| `Q`             | Quick capture                     |
| `/`             | Focus search                      |
| `Cmd/Ctrl + Shift + D` | Today's daily note         |
| `J` `K` `Enter` | Move through memos, open one      |
| `Cmd/Ctrl + B · I · K · L` | Bold, italic, link, list |
| `Cmd/Ctrl + Enter` | Save from a capture dialog     |
| `Esc`           | Close, or clear the search        |

---

## Deployment

The app deploys to any host that runs Node 20.9 or newer. On Vercel it is
detected automatically and needs no configuration:

```bash
npx vercel --prod
```

With no environment variables set, the deployed app keeps every workspace on its
own device. That is a complete, working deployment.

### Syncing across devices

To serve one shared workspace instead, set both of these:

| Variable            | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`      | PostgreSQL connection string                                  |
| `MEMO_ACCESS_TOKEN` | Passphrase each device enters once, under Settings            |

Both are required together. `/api/notes` has no per-user identity, so a shared
store without a passphrase would be readable and writable by anyone who found
the URL. The app refuses to enable it rather than let that happen quietly: with
`DATABASE_URL` set and `MEMO_ACCESS_TOKEN` missing, the API reports that it is
not configured and every browser stays on device storage.

The schema in `database/schema.sql` is applied automatically on first use; apply
it by hand if your database user cannot create tables.

### Other settings

| Variable               | Default                        | Purpose                                 |
| ---------------------- | ------------------------------ | --------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | detected on Vercel             | Canonical and Open Graph URLs           |
| `MEMO_SQLITE_PATH`     | `./data/memo-no-sekai.sqlite`  | Development database file               |
| `DATABASE_POOL_MAX`    | `4`                            | PostgreSQL pool size                    |

Copy `.env.example` to `.env.local` to set these locally. The SQLite store is
for development only: a serverless filesystem is read-only and discarded between
invocations, so it is never selected in production.

---

## Security

- **Encryption in the browser.** Protected memos are encrypted before they reach
  any store. See [Protecting a memo](#protecting-a-memo).
- **Content Security Policy.** Served per request with a fresh nonce from
  `middleware.ts`. Scripts run only with that nonce, inline event handlers
  cannot execute, and `object-src` and `frame-ancestors` are closed.
- **Markdown escaping.** The preview renders HTML the app builds from your text.
  Every character that could end a tag or an attribute is escaped first, and
  link and image targets are restricted to `http`, `https`, `mailto` and base64
  image data URLs.
- **Transport and framing.** HSTS, `X-Frame-Options: DENY`, `nosniff`, a closed
  `Permissions-Policy` and `strict-origin-when-cross-origin` referrers.
- **API input.** Request bodies are size-capped before parsing, and every memo is
  validated field by field. Memo responses are `no-store`.

To report a vulnerability, open a private security advisory on the repository
rather than a public issue.

---

## Project structure

```
app/
  page.tsx            Workspace UI
  layout.tsx          Document shell, metadata, fonts, theme bootstrap
  error.tsx           Error boundaries
  global-error.tsx
  not-found.tsx
  api/notes/route.ts  Notes API
  globals.css         Styles
lib/
  memo.ts             Domain types, limits, templates, samples
  markdown.ts         Markdown rendering and escaping
  search.ts           Structured search
  crypto.ts           Memo encryption
  client-store.ts     IndexedDB and preference storage
  sync-client.ts      Talks to /api/notes
  server-store.ts     Chooses and drives the server store
  validate-note.ts    Validation for API input and imports
  postgres-db.ts      PostgreSQL adapter
  local-db.ts         SQLite adapter, development only
tests/                Unit tests
database/schema.sql   PostgreSQL schema
middleware.ts         Per-request Content Security Policy
public/               Icons and service worker
```

---

## Contributing

Run `npm run verify` before opening a pull request; CI runs the same steps and
will not merge without them. Logic that can be tested without a browser belongs
in `lib/` with tests beside it in `tests/`.

## Browser support

Current versions of Chrome, Edge, Firefox and Safari. Memo protection needs Web
Crypto, which browsers expose only over HTTPS or on `localhost`; the rest of the
app works either way.

## License

MIT. See [LICENSE](LICENSE).
