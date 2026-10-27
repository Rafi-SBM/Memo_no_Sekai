import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml, excerpt, markdownToHtml, outgoingLinkTitles, taskStats } from "../lib/markdown";

describe("escaping", () => {
  it("escapes every character that can end a tag or an attribute", () => {
    assert.equal(
      escapeHtml(`<a href="x" title='y'>&`),
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;",
    );
  });

  it("neutralises a raw HTML tag in memo text", () => {
    const html = markdownToHtml('<img src=x onerror="alert(1)">');
    assert.ok(!html.includes("<img"));
    assert.ok(html.includes("&lt;img"));
  });

  it("does not let a link URL break out of its attribute", () => {
    // The quote here used to close href= and add an event handler to the anchor.
    const html = markdownToHtml('[click](https://example.com" onmouseover="alert(1))');
    // The text may survive as escaped content, but never as a real attribute.
    assert.ok(!/\son\w+\s*=\s*"/.test(html), html);
    assert.ok(!/href="[^"]*"[^>]*"/.test(html), html);
  });

  it("does not let an image URL or alt text break out of its attribute", () => {
    const html = markdownToHtml('![a" onerror="alert(1)](data:image/png;base64,AAAA)');
    assert.ok(!/\son\w+\s*=\s*"/.test(html), html);
    assert.ok(html.includes("&quot;"), html);
  });

  it("rejects a non-image data URL", () => {
    const html = markdownToHtml("![x](data:text/html;base64,PHNjcmlwdD4=)");
    assert.ok(!html.includes("<img"), html);
  });

  it("rejects a javascript: link", () => {
    const html = markdownToHtml("[go](javascript:alert(1))");
    assert.ok(!html.includes("<a href"), html);
  });
});

describe("markdownToHtml", () => {
  it("renders headings, emphasis and strikethrough", () => {
    assert.ok(markdownToHtml("# Title").includes("<h1>Title</h1>"));
    assert.ok(markdownToHtml("**bold**").includes("<strong>bold</strong>"));
    assert.ok(markdownToHtml("~~gone~~").includes("<del>gone</del>"));
  });

  it("treats underscores inside a word as text, not emphasis", () => {
    const html = markdownToHtml("call my_variable_name here");
    assert.ok(!html.includes("<em>"), html);
    assert.ok(markdownToHtml("an _aside_ here").includes("<em>aside</em>"));
  });

  it("leaves the contents of a fenced code block alone", () => {
    const html = markdownToHtml("```js\nconst a = **b**;\n```");
    assert.ok(html.includes("<pre><code>const a = **b**;</code></pre>"), html);
  });

  it("numbers task checkboxes in document order", () => {
    const html = markdownToHtml("- [ ] one\n- [x] two\n- [ ] three");
    assert.deepEqual(
      Array.from(html.matchAll(/data-task-index="(\d+)"/g), (match) => match[1]),
      ["0", "1", "2"],
    );
    assert.equal((html.match(/checked/g) || []).length, 1);
  });

  it("renders an external link that opens safely", () => {
    const html = markdownToHtml("[docs](https://example.com/a)");
    assert.ok(html.includes('rel="noreferrer noopener"'), html);
    assert.ok(html.includes('target="_blank"'), html);
  });

  it("renders a wiki link whose target survives round-tripping", () => {
    const html = markdownToHtml("see [[My Memo & Co]]");
    const href = /href="#memo-([^"]+)"/.exec(html)?.[1];
    assert.ok(href);
    assert.equal(decodeURIComponent(href), "My Memo & Co");
  });

  it("renders ordered list items", () => {
    assert.ok(markdownToHtml("1. first").includes('<li class="ordered-item">first</li>'));
  });
});

describe("taskStats", () => {
  it("counts open and completed checkboxes", () => {
    assert.deepEqual(taskStats("- [ ] a\n- [x] b\n* [X] c"), { total: 3, completed: 2 });
  });

  it("ignores checkboxes inside a code block", () => {
    assert.deepEqual(taskStats("```\n- [ ] not a task\n```\n- [x] real"), { total: 1, completed: 1 });
  });

  it("agrees with the renderer about which lines are tasks", () => {
    const content = "- [ ] one\n- [x] \n- [ ] three";
    const rendered = (markdownToHtml(content).match(/data-task-index/g) || []).length;
    assert.equal(taskStats(content).total, rendered);
  });
});

describe("excerpt", () => {
  it("flattens Markdown into one readable line", () => {
    assert.equal(excerpt("# Title\n\nSome **bold** text"), "Title Some bold text");
  });

  it("drops an embedded image rather than printing its data URL", () => {
    assert.equal(excerpt("before ![pic](data:image/png;base64,AAAA) after"), "before after");
  });

  it("truncates with an ellipsis", () => {
    assert.equal(excerpt("abcdefghij", 5), "abcde…");
  });
});

describe("outgoingLinkTitles", () => {
  it("collects and trims every wiki link", () => {
    assert.deepEqual(outgoingLinkTitles("[[ One ]] and [[Two]]"), ["One", "Two"]);
  });
});
