/**
 * Shared memo domain types and constants.
 *
 * This module is imported by the browser UI, the API route and the storage
 * adapters, so it must stay free of Node- and DOM-only APIs.
 */

export type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder?: string;
  dueAt?: string;
  createdAt?: string;
  updatedAt: string;
  favorite?: boolean;
  archived?: boolean;
  pinned?: boolean;
  deleted?: boolean;
  protected?: boolean;
  encryptedContent?: string;
  recoveryEncryptedContent?: string;
  color: string;
};

export type MemoTemplate = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  color: string;
  content: string;
  custom?: boolean;
};

export type SavedSearch = { id: string; name: string; query: string };

export type Revision = { content: string; title: string; savedAt: string };

export const noteColors = ["yellow", "blue", "purple", "green", "orange"] as const;

/** Upper bounds shared by the import path and the API validator. */
export const limits = {
  id: 200,
  title: 500,
  folder: 100,
  tag: 80,
  tagsPerNote: 50,
  content: 10_000_000,
  encryptedContent: 12_000_000,
  templateContent: 100_000,
  customTemplates: 30,
  savedSearches: 100,
  customFolders: 100,
  revisionsPerNote: 20,
  undoDepth: 50,
  /** Largest accepted `/api/notes` request body, in bytes. */
  requestBody: 32 * 1024 * 1024,
  /** Largest image accepted as an inline data URL, in bytes. */
  image: 2 * 1024 * 1024,
} as const;

export const defaultAccent = "#df6b43";

export const isNoteColor = (value: unknown): value is (typeof noteColors)[number] =>
  typeof value === "string" && (noteColors as readonly string[]).includes(value);

export const templates: MemoTemplate[] = [
  {
    id: "daily",
    title: "Daily note",
    description: "A quick check-in for today",
    tags: ["journal", "daily"],
    color: "green",
    content: "## What happened\n\n\n## What I learned\n\n\n## Tomorrow\n\n",
  },
  {
    id: "meeting",
    title: "Meeting notes",
    description: "Keep decisions and next steps together",
    tags: ["work", "meeting"],
    color: "blue",
    content: "## Agenda\n\n\n## Notes\n\n\n## Decisions\n\n\n## Next steps\n- [ ] ",
  },
  {
    id: "project",
    title: "Project brief",
    description: "Turn an idea into a clear starting point",
    tags: ["work", "project"],
    color: "orange",
    content: "## Goal\n\n\n## Why now\n\n\n## First milestone\n\n\n## Open questions\n\n",
  },
];

/**
 * Sample memos shown on a brand new workspace so the first screen is not empty.
 * They are written to storage only when no saved workspace exists.
 */
export const sampleNotes: Note[] = [
  {
    id: "sample-starting-small",
    title: "The quiet power of starting small",
    content:
      "A tiny beginning is still a beginning.\n\nThe first draft is not supposed to be good — it is supposed to exist. Keep the bar low enough to cross, then keep moving.",
    tags: ["writing", "ideas"],
    folder: "inbox",
    createdAt: "2026-08-27T09:10:00.000Z",
    updatedAt: "2026-08-27T09:10:00.000Z",
    favorite: true,
    pinned: true,
    color: "yellow",
  },
  {
    id: "sample-product-thoughts",
    title: "Product thoughts",
    content:
      "Make the first minute feel effortless.\n\n- Reduce the surface area\n- Keep capture one click away\n- Let the user find their way back",
    tags: ["work", "product"],
    folder: "work",
    createdAt: "2026-08-26T16:30:00.000Z",
    updatedAt: "2026-08-26T16:30:00.000Z",
    color: "blue",
  },
  {
    id: "sample-books",
    title: "Books to return to",
    content:
      "The Art of Possibility\nThe Creative Act\nFour Thousand Weeks\n\nA good book is a room you can visit again.",
    tags: ["reading", "personal"],
    folder: "personal",
    createdAt: "2026-08-25T12:04:00.000Z",
    updatedAt: "2026-08-25T12:04:00.000Z",
    favorite: true,
    color: "purple",
  },
  {
    id: "sample-morning-pages",
    title: "Morning pages",
    content:
      "There is something about writing before the day gets loud. Leave the phone in another room. Make tea. Start with whatever is true.",
    tags: ["journal"],
    folder: "personal",
    createdAt: "2026-08-24T08:40:00.000Z",
    updatedAt: "2026-08-24T08:40:00.000Z",
    color: "green",
  },
  {
    id: "sample-studio-ideas",
    title: "Ideas for the studio",
    content:
      "A small library of beautiful, useful things.\n\nMaybe the best products feel like places rather than tools.",
    tags: ["ideas", "studio"],
    folder: "work",
    createdAt: "2026-08-21T18:15:00.000Z",
    updatedAt: "2026-08-21T18:15:00.000Z",
    color: "orange",
  },
];

/** Strips plaintext from protected memos before anything leaves the editor session. */
export const redactProtected = (notes: Note[]): Note[] =>
  notes.map((note) => (note.protected ? { ...note, content: "" } : note));
