# Memo no Sekai

A local-first Next.js memo workspace for capturing, organizing, and reconnecting ideas. The original static prototype remains in the repository for reference; the active app lives in `app/`.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Run `npm run lint` for the non-interactive ESLint check and `npm run build` for the production type/build check.

The included `.env.local` uses the local PostgreSQL database `memo_no_sekai`. Apply `database/schema.sql` first if setting up the database on another machine. Remove `DATABASE_URL` to use the SQLite fallback.

## Features

### Local-first workspace
- **Local PostgreSQL persistence** - Set `DATABASE_URL` to use the Supabase-compatible PostgreSQL repository
- **Idempotent database setup** - PostgreSQL and SQLite adapters self-heal missing memo columns and maintain indexes for updated, due, folder, and visibility queries
- **SQLite fallback** - Without `DATABASE_URL`, notes use the local SQLite repository
- **Offline fallback** - Browser storage keeps the workspace usable if the API is unavailable
- **Protected memos** - AES-GCM encryption with password-based unlock

### Memo management
- **Full lifecycle** - Create, edit, archive, trash, restore, and permanently delete
- **Bulk actions** - Select visible memos and add/remove tags, move to a folder, favorite/pin, archive, or move several to trash together
- **Selection export** - Download only the selected memos as a portable JSON backup; protected memo text remains redacted
- **Fast capture** - Daily, meeting, and project templates with duplicate-safe daily notes
- **Custom templates** - Save any ordinary memo as a reusable local template, use it later, remove it, and carry it through JSON backups
- **Search and sort** - Search title, content, and tags with result highlighting; sort by updated, due date, title, or created
- **Structured search** - Use queries such as `tag:work`, `folder:personal`, `content:meeting`, `date:today`, `date:yesterday`, `date:week`, `date:month`, `date:2026-10-04`, `is:favorite`, `is:protected`, `is:unprotected`, `is:task`, `is:open`, `is:completed`, `is:overdue`, or `-tag:work`
- **Saved views** - Save recurring structured queries and reopen them from the sidebar or command palette
- **Tags, favorites, and pins** - Organize and filter quickly; nested tags such as `work/projects` are browsable through their parent namespace
- **Folders** - Assign memos to inbox, work, personal, or custom folders and filter them instantly
- **Due dates and calendar** - Add optional due dates, review the Upcoming view, browse scheduled memos by month in Calendar, and spot overdue memos directly on cards
- **Markdown workflow** - Formatting helpers, keyboard shortcuts (`⌘/Ctrl + B/I/K/L`), inline/fenced code, blockquotes, strikethrough, horizontal rules, undo/redo, clickable `[[memo title]]` links, external links, and preview mode
- **Version history** - Keep up to 20 local snapshots per ordinary memo and restore an earlier revision from the editor; protected memo plaintext is excluded
- **Interactive checklists** - Click Markdown task boxes using `-`, `*`, or `+` markers in preview and keep the `[x]` state in the memo; press Enter to continue or cleanly exit bullets, ordered lists, and checklists while writing
- **Task workspace** - Find checklist memos with `is:task` or the Tasks sidebar view, triage `is:open`/`is:completed`, use the Open/Completed task board, see completion progress while editing, and archive completed task memos in one reversible action
- **Local image embeds** - Add PNG, JPEG, GIF, or WebP images up to 2 MB directly into a memo as portable Markdown data URLs
- **Connections view** - Interactive visual graph plus outgoing links and backlinks between memos
- **Local memo links** - Copy a memo URL and reopen that memo directly in the same local workspace
- **Wiki-link autocomplete** - Type `[[` to search existing memo titles and insert a linked memo with the keyboard
- **Import/export** - Portable versioned JSON workspace backups, including notes, custom folders, and saved views; older notes-only exports remain importable
- **Plain-text export** - Human-readable `.txt` export from the command palette
- **Analytics** - Activity, word count, and tag usage
- **Quick capture** - Save a thought from a compact dialog with `Q` or the pen action, then continue in the full editor
- **Web link capture** - Save an `http`/`https` page with optional context as a tagged Markdown memo from the sidebar or command palette
- **PWA share capture** - On installed browsers, share a URL, title, or text from another app directly into the link/quick-capture dialog

### Interface
- Responsive layout, light/dark themes, memo color palette, live save/offline status, keyboard-accessible cards, J/K/Enter memo navigation, smooth motion, and a searchable command palette (`⌘/Ctrl + K`) with action and quick-open memo results; Escape clears active search
- Workspace view and sort preferences persist locally across reloads
- New memo shortcut (`⌘/Ctrl + N`)
- Quick capture shortcut (`Q`), with `⌘/Ctrl + Enter` to save
- Web link capture from **Save a web link** or the command palette
- Installed PWA share target for URLs and shared text

### Technical details
- **Next.js App Router** - React UI in `app/page.tsx`
- **Local persistence** - PostgreSQL repository in `lib/postgres-db.ts` when `DATABASE_URL` is set; SQLite repository in `lib/local-db.ts` otherwise, with `localStorage` fallback
- **Exact workspace sync** - Full `PUT` snapshots remove permanently deleted rows while single-note `POST` upserts remain non-destructive
- **Installable** - Next.js web manifest and app icon included for PWA-capable browsers
- **Clerk seam** - Account controls are intentionally deferred until auth is added
- **Supabase seam** - Replace local persistence calls when remote sync is introduced

## 🎯 Use Cases

- **Personal Notes** - Daily thoughts and ideas
- **Secure Journaling** - Password-protected entries
- **Project Planning** - Organize with tags and search
- **Code Snippets** - Store and find code quickly
- **Meeting Notes** - Quick capture and organization
- **Research** - Collect and categorize information

## 🛠️ Technical Details

### Architecture
The `/api/notes` route selects PostgreSQL from `lib/postgres-db.ts` when `DATABASE_URL` is configured, otherwise it uses the SQLite repository in `lib/local-db.ts`. `localStorage` remains an offline fallback. The UI does not depend on auth, so Clerk can be added later. The PostgreSQL repository is intentionally close to the Supabase schema so remote sync can replace it cleanly.

For local PostgreSQL, create a database, apply `database/schema.sql`, copy `.env.example` to `.env.local`, and start the app.

### Browser Support
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

### File Structure
```
memo-no-sekai/
├── app/                  # Next.js App Router UI and API route
├── database/schema.sql   # Supabase-compatible PostgreSQL schema
├── lib/                  # PostgreSQL and SQLite repositories
├── public/               # PWA assets and service worker
├── .env.local            # Local DATABASE_URL (not committed)
└── README.md
```

## 🚀 Deployment Options

### 1. Netlify (Easiest)
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the project folder
3. Your app is live!

### 2. GitHub Pages
1. Create a new repository
2. Upload files
3. Enable GitHub Pages in settings
4. Access at `username.github.io/repo-name`

### 3. Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Follow the prompts

### 4. Traditional Web Hosting
Deploy the Next.js app to a Node-compatible host such as Vercel or a self-hosted server.

## 🎨 Customization

### Colors
Edit the CSS variables in the `<style>` section:
```css
:root {
    --primary: #6366f1;        /* Main brand color */
    --secondary: #06b6d4;      /* Accent color */
    --success: #059669;        /* Success messages */
    --danger: #dc2626;         /* Error messages */
    /* ... more variables */
}
```

### Features
- Enable/disable password protection
- Modify search functionality
- Customize export formats
- Add new themes

## 🔒 Security Notes

- **Client-side encryption** - Protected memo content is encrypted in the browser with AES-GCM before it is written to the local database.
- **Local development database** - The current PostgreSQL adapter is intended for a local trusted environment; add authentication and authorization before exposing it remotely.
- **Recovery Codes** - Save each recovery code securely; it can remove the old password from that memo.
- **Strong Passwords** - Use complex passwords for protected notes.

## 📱 Mobile Support

- **Responsive Design** - Optimized for mobile devices
- **Touch Friendly** - Large tap targets
- **iOS/Android** - Works on all mobile browsers
- **PWA Ready** - Can be installed as an app

## 🤝 Contributing

The active application is the Next.js app in `app/`. The original static prototype remains for reference. To contribute:

1. Fork the repository
2. Edit the relevant Next.js, repository, or schema file
3. Test your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use, modify, and distribute.

## 🆘 Support

### Common Issues
- **Notes not saving**: Check browser storage permissions
- **Encryption not working**: Use a modern browser with Web Crypto support and make sure JavaScript is enabled
- **Mobile issues**: Use HTTPS for full functionality

### Browser Console
Press F12 and check the Console tab for any error messages.

## 🎉 Success!

You now have a complete, professional note-taking application that:
- ✅ Works offline
- ✅ Protects your privacy
- ✅ Looks modern and professional
- ✅ Requires no setup or installation
- ✅ Can be deployed anywhere

---

**Memo no Sekai** - Where your thoughts find their world. 📝✨
