/**
 * The small Markdown subset used by the memo preview.
 *
 * Everything here runs on memo text the user typed or imported, and the result
 * is injected with `dangerouslySetInnerHTML`, so escaping is the first step and
 * every generated attribute value is built from already-escaped text.
 */

const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes every character that could terminate a tag or an attribute value.
 *
 * Escaping the quote characters is what keeps a crafted link such as
 * `[x](https://a" onmouseover="steal())` from adding an event handler to the
 * anchor this renderer emits.
 */
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => entities[char]);

const unescapeHtml = (value: string) =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** Matches an inline image whose source is a base64 data URL of a web image format. */
const imagePattern = /!\[([^\]]*)\]\((data:image\/(?:png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+)\)/gi;

/** Matches a link whose target is an absolute http(s) or mailto address. */
const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)<>"']+|mailto:[^\s)<>"']+)\)/gi;

const internalLinkPattern = /\[\[([^\][]+)\]\]/g;

const fencedCodePattern = /```(?:[a-zA-Z0-9_+-]+)?\n?([\s\S]*?)```/g;

/**
 * Renders the supported Markdown subset to HTML.
 *
 * Supported: fenced and inline code, headings, bold, italic, strikethrough,
 * blockquotes, horizontal rules, bullet/ordered/task lists, inline images as
 * data URLs, external links, and `[[wiki links]]` to other memos.
 */
export function markdownToHtml(value: string) {
  let taskIndex = 0;
  const codeBlocks: string[] = [];

  return (
    escapeHtml(value)
      // Code first: its contents must not be re-interpreted as Markdown.
      .replace(fencedCodePattern, (_match, code: string) => {
        const token = `@@CODE${codeBlocks.length}@@`;
        codeBlocks.push(`<pre><code>${code.replace(/^\n+|\n+$/g, "")}</code></pre>`);
        return token;
      })
      .replace(/`([^`\n]+)`/g, "<code>$1</code>")
      .replace(/~~(.*?)~~/g, "<del>$1</del>")
      .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^(?:---|___|\*\*\*)$/gm, "<hr />")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Underscore emphasis only at word boundaries, so snake_case survives.
      .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,;:!?])/gm, "$1<em>$2</em>")
      .replace(internalLinkPattern, (_match, title: string) => {
        const target = encodeURIComponent(unescapeHtml(title).trim());
        return `<a class="internal-link" href="#memo-${target}">${title}</a>`;
      })
      .replace(imagePattern, (_match, alt: string, source: string) => {
        return `<img src="${source}" alt="${alt}" loading="lazy" decoding="async" />`;
      })
      .replace(linkPattern, (_match, text: string, href: string) => {
        return `<a href="${href}" target="_blank" rel="noreferrer noopener">${text}</a>`;
      })
      .replace(
        /^\s*[-*+] \[([ xX])\] (.*)$/gm,
        (_match, mark: string, text: string) =>
          `<li class="task-item"><label><input type="checkbox" data-task-index="${taskIndex++}"${
            mark.toLowerCase() === "x" ? " checked" : ""
          } /> ${text}</label></li>`,
      )
      .replace(/^\s*[-*+] (.*)$/gm, "<li>$1</li>")
      .replace(/^\s*\d+\. (.*)$/gm, '<li class="ordered-item">$1</li>')
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br />")
      // Restore code blocks last so nothing inside them was rewritten.
      .replace(/@@CODE(\d+)@@/g, (_match, index: string) => codeBlocks[Number(index)] ?? "")
  );
}

/** A single-line, Markdown-free summary for memo cards. */
export const excerpt = (value: string, length = 118) => {
  const flat = value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\[([^\][]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s*/gm, "")
    .replace(/[#*_>`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > length ? `${flat.slice(0, length)}…` : flat;
};

/**
 * Counts Markdown checkboxes outside fenced code blocks.
 *
 * The pattern deliberately matches the same lines as the task rule in
 * `markdownToHtml`, so the progress counter and the clickable checkbox
 * indexes can never drift apart.
 */
export const taskStats = (content: string) => {
  const source = content.replace(/```[\s\S]*?```/g, "");
  const tasks = source.match(/^\s*[-*+] \[[ xX]\] .*$/gm) || [];
  return { total: tasks.length, completed: tasks.filter((task) => /\[x\]/i.test(task)).length };
};

export const wordCount = (content: string) => content.split(/\s+/).filter(Boolean).length;

/** Titles referenced from this memo through `[[wiki links]]`. */
export const outgoingLinkTitles = (content: string) =>
  Array.from(content.matchAll(internalLinkPattern), (match) => match[1].trim());
