import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Note } from "../lib/memo";
import {
  highlightTerms,
  isOverdue,
  matchesDateQuery,
  matchesSearch,
  normalizeTag,
  tagMatches,
  tagNamespaces,
} from "../lib/search";

const note = (overrides: Partial<Note> = {}): Note => ({
  id: "n1",
  title: "Quarterly plan",
  content: "Ship the thing.\n- [ ] draft\n- [x] review",
  tags: ["work", "work/projects"],
  folder: "work",
  updatedAt: new Date(2026, 9, 20, 10).toISOString(),
  color: "blue",
  ...overrides,
});

const localNoon = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12);
const now = localNoon(2026, 10, 20);

describe("normalizeTag", () => {
  it("lowercases, hyphenates and trims separators", () => {
    assert.equal(normalizeTag("  Work Projects  "), "work-projects");
    assert.equal(normalizeTag("/Work//Projects/"), "work/projects");
  });
});

describe("tagMatches", () => {
  it("matches a tag and its descendants but not a sibling", () => {
    assert.ok(tagMatches("work", "work"));
    assert.ok(tagMatches("work/projects", "work"));
    assert.ok(!tagMatches("workshop", "work"));
  });
});

describe("tagNamespaces", () => {
  it("lists every ancestor of a nested tag", () => {
    assert.deepEqual(tagNamespaces("work/projects/api"), ["work", "work/projects", "work/projects/api"]);
  });
});

describe("matchesSearch", () => {
  it("matches an empty query", () => {
    assert.ok(matchesSearch(note(), "", now));
  });

  it("requires every token to match", () => {
    assert.ok(matchesSearch(note(), "quarterly ship", now));
    assert.ok(!matchesSearch(note(), "quarterly missing", now));
  });

  it("honours a negated token", () => {
    assert.ok(matchesSearch(note(), "-missing", now));
    assert.ok(!matchesSearch(note(), "-quarterly", now));
  });

  it("scopes a field token to that field", () => {
    assert.ok(matchesSearch(note(), "title:quarterly", now));
    assert.ok(!matchesSearch(note(), "title:ship", now));
    assert.ok(matchesSearch(note(), "content:ship", now));
  });

  it("matches a parent tag against a nested tag", () => {
    assert.ok(matchesSearch(note(), "tag:work", now));
    assert.ok(matchesSearch(note(), "tag:work/projects", now));
    assert.ok(!matchesSearch(note(), "tag:home", now));
  });

  it("supports a quoted phrase", () => {
    assert.ok(matchesSearch(note({ content: "the quarterly plan is ready" }), '"quarterly plan"', now));
  });

  it("resolves is: state tokens", () => {
    assert.ok(matchesSearch(note(), "is:task", now));
    assert.ok(matchesSearch(note(), "is:open", now));
    assert.ok(!matchesSearch(note(), "is:completed", now));
    assert.ok(matchesSearch(note({ favorite: true }), "is:favorite", now));
    assert.ok(matchesSearch(note(), "is:unprotected", now));
    assert.ok(matchesSearch(note({ protected: true }), "is:protected", now));
  });

  it("marks a memo with a past due date as overdue", () => {
    assert.ok(matchesSearch(note({ dueAt: new Date(2026, 9, 1, 9).toISOString() }), "is:overdue", now));
    assert.ok(!matchesSearch(note({ dueAt: new Date(2026, 11, 1, 9).toISOString() }), "is:overdue", now));
  });

  it("does not match a partial is: value", () => {
    assert.ok(!matchesSearch(note({ favorite: true }), "is:fav", now));
  });
});

describe("matchesDateQuery", () => {
  const today = localNoon(2026, 10, 20).toISOString();
  const yesterday = localNoon(2026, 10, 19).toISOString();

  it("resolves today and yesterday", () => {
    assert.ok(matchesDateQuery(today, "today", now));
    assert.ok(matchesDateQuery(yesterday, "yesterday", now));
    assert.ok(!matchesDateQuery(yesterday, "today", now));
  });

  it("resolves a window of recent days", () => {
    assert.ok(matchesDateQuery(localNoon(2026, 10, 15).toISOString(), "week", now));
    assert.ok(!matchesDateQuery(localNoon(2026, 10, 1).toISOString(), "week", now));
    assert.ok(matchesDateQuery(localNoon(2026, 10, 1).toISOString(), "month", now));
  });

  it("resolves an exact local date", () => {
    assert.ok(matchesDateQuery(today, "2026-10-20", now));
    assert.ok(!matchesDateQuery(today, "2026-10-19", now));
  });

  it("rejects a value that is not a date", () => {
    assert.ok(!matchesDateQuery("not a date", "today", now));
    assert.ok(!matchesDateQuery(undefined, "today", now));
  });

  it("rejects an unknown keyword", () => {
    assert.ok(!matchesDateQuery(today, "someday", now));
  });
});

describe("isOverdue", () => {
  it("treats a due date earlier today as not yet overdue", () => {
    assert.ok(!isOverdue(new Date(2026, 9, 20, 1).toISOString(), new Date(2026, 9, 20, 23)));
  });

  it("treats yesterday as overdue", () => {
    assert.ok(isOverdue(new Date(2026, 9, 19, 23).toISOString(), new Date(2026, 9, 20, 1)));
  });

  it("ignores an unparseable date", () => {
    assert.ok(!isOverdue("nonsense", now));
  });
});

describe("highlightTerms", () => {
  it("returns searchable words and skips state selectors", () => {
    assert.deepEqual(highlightTerms("quarterly is:favorite tag:work"), ["quarterly", "work"]);
  });

  it("drops single characters that would highlight everything", () => {
    assert.deepEqual(highlightTerms("a plan"), ["plan"]);
  });
});
