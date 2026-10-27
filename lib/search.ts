/**
 * Structured memo search.
 *
 * A query is a list of whitespace-separated tokens. A token may be a bare word,
 * a quoted phrase, or `field:value`; a leading `-` negates it. Every token must
 * match for the memo to match.
 *
 * Supported fields: `tag`, `folder`, `title`, `content`, `date`, `is`.
 */

import { taskStats } from "./markdown";
import type { Note } from "./memo";

const dayMs = 86_400_000;

/** Lowercases a tag and collapses whitespace so `Work Projects` and `work/projects` behave. */
export const normalizeTag = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");

/** True when `tag` is `query` itself or nested beneath it (`work` matches `work/projects`). */
export const tagMatches = (tag: string, query: string) => tag === query || tag.startsWith(`${query}/`);

/** Every ancestor of a nested tag, so `work/projects/api` is browsable at each level. */
export const tagNamespaces = (tag: string) => {
  const parts = tag.split("/");
  return parts.map((_part, index) => parts.slice(0, index + 1).join("/"));
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const localIsoDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

/** True when a memo's due date has passed, measured against the start of today. */
export const isOverdue = (value: string, now = new Date()) => {
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < startOfDay(now).getTime();
};

/**
 * Resolves a `date:` token. Accepts `today`, `yesterday`, `week`, `month`
 * and an exact local `YYYY-MM-DD`.
 */
export const matchesDateQuery = (value: string | undefined, query: string, now = new Date()) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = startOfDay(now);
  const target = startOfDay(date);
  if (query === "today") return target.getTime() === today.getTime();
  if (query === "yesterday") return target.getTime() === today.getTime() - dayMs;
  if (query === "week")
    return target.getTime() >= today.getTime() - 6 * dayMs && target.getTime() <= today.getTime();
  if (query === "month")
    return target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth();
  if (/^\d{4}-\d{2}-\d{2}$/.test(query)) return localIsoDate(target) === query;
  return false;
};

/** Splits a raw query into bare words and quoted phrases. */
export const tokenizeQuery = (rawQuery: string) => rawQuery.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

type ParsedToken = { negative: boolean; field: string; value: string };

export const parseToken = (rawToken: string): ParsedToken => {
  const negative = rawToken.startsWith("-");
  const token = (negative ? rawToken.slice(1) : rawToken).replace(/^"|"$/g, "");
  const separator = token.indexOf(":");
  const field = separator > 0 ? token.slice(0, separator).toLowerCase() : "all";
  const rawValue = separator > 0 ? token.slice(separator + 1) : token;
  return {
    negative,
    field,
    value: field === "tag" ? normalizeTag(rawValue) : rawValue.replace(/^"|"$/g, "").toLowerCase(),
  };
};

/** The space-separated state words a memo exposes to `is:` tokens. */
const stateWords = (note: Note, now: Date) => {
  const stats = taskStats(note.content);
  const words = [note.protected ? "protected" : "unprotected"];
  if (note.favorite) words.push("favorite");
  if (note.pinned) words.push("pinned");
  if (note.archived) words.push("archived");
  if (note.deleted) words.push("trashed");
  if (stats.total) {
    words.push("task");
    words.push(stats.completed === stats.total ? "completed" : "open");
  }
  if (note.dueAt) words.push("due", isOverdue(note.dueAt, now) ? "overdue" : "upcoming");
  return words;
};

/** True when every token in `rawQuery` is satisfied by `note`. */
export function matchesSearch(note: Note, rawQuery: string, now = new Date()) {
  const tokens = tokenizeQuery(rawQuery);
  if (!tokens.length) return true;
  const haystack =
    `${note.title} ${note.content} ${note.tags.join(" ")} ${note.folder || "inbox"}`.toLowerCase();

  return tokens.every((rawToken) => {
    const { negative, field, value } = parseToken(rawToken);
    if (!value) return true;

    let found: boolean;
    switch (field) {
      case "tag":
        found = note.tags.some((tag) => tagMatches(tag, value));
        break;
      case "folder":
        found = (note.folder || "inbox").toLowerCase().includes(value);
        break;
      case "title":
        found = note.title.toLowerCase().includes(value);
        break;
      case "content":
        found = note.content.toLowerCase().includes(value);
        break;
      case "date":
        found = matchesDateQuery(note.updatedAt, value, now);
        break;
      case "due":
        found = matchesDateQuery(note.dueAt, value, now);
        break;
      case "is":
        found = stateWords(note, now).includes(value);
        break;
      default:
        found = haystack.includes(value);
    }
    return negative ? !found : found;
  });
}

/** The distinct terms a query should highlight in result text. */
export function highlightTerms(query: string) {
  return Array.from(
    new Set(
      tokenizeQuery(query)
        .map((rawToken) => {
          const { field, value } = parseToken(rawToken);
          // `is:` and `date:` select memos rather than describing their text.
          return field === "is" || field === "date" || field === "due" ? "" : value;
        })
        .filter((term) => term.length > 1),
    ),
  );
}
