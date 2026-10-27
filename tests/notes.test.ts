import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decryptText, encryptText, makeRecoveryCode } from "../lib/crypto";
import { limits, redactProtected, type Note } from "../lib/memo";
import { coerceImportedNote, isValidNote } from "../lib/validate-note";

const valid: Note = {
  id: "n1",
  title: "A memo",
  content: "body",
  tags: ["work"],
  folder: "inbox",
  updatedAt: "2026-10-20T10:00:00.000Z",
  color: "blue",
};

describe("isValidNote", () => {
  it("accepts a well-formed memo", () => {
    assert.ok(isValidNote(valid));
  });

  it("accepts a memo with only the required fields", () => {
    assert.ok(
      isValidNote({
        id: "a",
        title: "t",
        content: "",
        tags: [],
        updatedAt: valid.updatedAt,
        color: "yellow",
      }),
    );
  });

  it("rejects a non-object", () => {
    for (const value of [null, undefined, 7, "note", []]) assert.ok(!isValidNote(value));
  });

  it("rejects a blank or oversized title", () => {
    assert.ok(!isValidNote({ ...valid, title: "   " }));
    assert.ok(!isValidNote({ ...valid, title: "x".repeat(limits.title + 1) }));
  });

  it("rejects an unknown colour", () => {
    assert.ok(!isValidNote({ ...valid, color: "chartreuse" }));
  });

  it("rejects an unparseable timestamp", () => {
    assert.ok(!isValidNote({ ...valid, updatedAt: "whenever" }));
    assert.ok(!isValidNote({ ...valid, dueAt: "whenever" }));
  });

  it("rejects tags that are not strings or are too many", () => {
    assert.ok(!isValidNote({ ...valid, tags: [1, 2] }));
    assert.ok(!isValidNote({ ...valid, tags: Array(limits.tagsPerNote + 1).fill("x") }));
  });

  it("rejects a non-boolean flag", () => {
    assert.ok(!isValidNote({ ...valid, favorite: "yes" }));
  });

  it("rejects content past the ceiling", () => {
    assert.ok(!isValidNote({ ...valid, content: "x".repeat(limits.content + 1) }));
  });
});

describe("coerceImportedNote", () => {
  const takeId = () => "generated";

  it("repairs a sparse memo rather than rejecting it", () => {
    const result = coerceImportedNote({ title: "Old memo" }, takeId);
    assert.ok(result);
    assert.equal(result.title, "Old memo");
    assert.deepEqual(result.tags, ["inbox"]);
    assert.equal(result.folder, "inbox");
    assert.equal(result.color, "yellow");
    assert.equal(result.deleted, false);
  });

  it("rejects an entry with no usable title", () => {
    assert.equal(coerceImportedNote({ content: "orphan" }, takeId), null);
    assert.equal(coerceImportedNote(null, takeId), null);
  });

  it("never imports a memo straight into the trash", () => {
    assert.equal(coerceImportedNote({ title: "t", deleted: true }, takeId)?.deleted, false);
  });

  it("keeps a protected memo's ciphertext but not any plaintext", () => {
    const result = coerceImportedNote(
      { title: "Secret", protected: true, content: "leaked", encryptedContent: "{}" },
      takeId,
    );
    assert.equal(result?.content, "");
    assert.equal(result?.encryptedContent, "{}");
  });

  it("normalises tags and drops duplicates", () => {
    assert.deepEqual(coerceImportedNote({ title: "t", tags: ["Work ", "work", 5] }, takeId)?.tags, ["work"]);
  });

  it("reuses a free id and asks for a new one otherwise", () => {
    const used = new Set(["taken"]);
    const take = (candidate?: string) => {
      const id = candidate && !used.has(candidate) ? candidate : "fresh";
      used.add(id);
      return id;
    };
    assert.equal(coerceImportedNote({ title: "a", id: "free" }, take)?.id, "free");
    assert.equal(coerceImportedNote({ title: "b", id: "taken" }, take)?.id, "fresh");
  });
});

describe("redactProtected", () => {
  it("strips plaintext from protected memos only", () => {
    const result = redactProtected([valid, { ...valid, id: "n2", protected: true }]);
    assert.equal(result[0].content, "body");
    assert.equal(result[1].content, "");
  });
});

describe("memo protection", () => {
  it("round-trips content through a password", async () => {
    const envelope = await encryptText("a private thought", "correct horse");
    assert.ok(!envelope.includes("a private thought"));
    assert.equal(await decryptText(envelope, "correct horse"), "a private thought");
  });

  it("refuses the wrong password", async () => {
    const envelope = await encryptText("secret", "right");
    await assert.rejects(() => decryptText(envelope, "wrong"));
  });

  it("refuses a malformed envelope", async () => {
    await assert.rejects(() => decryptText("{}", "any"));
    await assert.rejects(() => decryptText("not json", "any"));
  });

  it("still reads an envelope written before the iteration count was recorded", async () => {
    const envelope = JSON.parse(await encryptText("legacy", "pass")) as Record<string, unknown>;
    const iterations = envelope.iterations;
    delete envelope.iterations;
    // Without the field the reader must fall back to the original 120k iterations,
    // so an envelope written at the current count should no longer open.
    assert.equal(iterations, 600_000);
    await assert.rejects(() => decryptText(JSON.stringify(envelope), "pass"));
  });

  it("produces a readable recovery code", () => {
    const code = makeRecoveryCode();
    assert.match(code, /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){2}$/);
    assert.notEqual(code, makeRecoveryCode());
  });
});
