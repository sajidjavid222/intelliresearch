import type { ReactNode } from "react";

/**
 * A tiny, dependency-free Markdown renderer for LLM output.
 * Handles the common subset models actually emit — headings, bold/italic,
 * inline code, and bullet/numbered lists — so users see formatted text
 * instead of literal `*`, `#`, and `` ` `` characters.
 */

// Inline: **bold**, __bold__, *italic*, _italic_, `code`.
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10"
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("**") || tok.startsWith("__")) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const BULLET = /^\s*[-*+•]\s+/;
const ORDERED = /^\s*\d+[.)]\s+/;
const HEADING = /^\s*(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])\1{2,}\s*$/;

export function Markdown({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push(<hr key={key++} className="my-3 border-black/10 dark:border-white/10" />);
      i++;
      continue;
    }

    const h = line.match(HEADING);
    if (h) {
      const level = h[1].length;
      const size =
        level <= 1 ? "text-[1.05em] font-bold" : level === 2 ? "font-semibold" : "font-semibold";
      blocks.push(
        <p key={key++} className={`mt-3 first:mt-0 ${size}`}>
          {renderInline(h[2])}
        </p>
      );
      i++;
      continue;
    }

    if (BULLET.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && BULLET.test(lines[i])) {
        items.push(<li key={items.length}>{renderInline(lines[i].replace(BULLET, ""))}</li>);
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-1.5 list-disc space-y-1 pl-5">
          {items}
        </ul>
      );
      continue;
    }

    if (ORDERED.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && ORDERED.test(lines[i])) {
        items.push(<li key={items.length}>{renderInline(lines[i].replace(ORDERED, ""))}</li>);
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-1.5 list-decimal space-y-1 pl-5">
          {items}
        </ol>
      );
      continue;
    }

    // Paragraph: gather consecutive plain lines, keep soft line breaks.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !ORDERED.test(lines[i]) &&
      !RULE.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="mt-2 whitespace-pre-line first:mt-0">
        {para.flatMap((p, idx) =>
          idx === 0 ? renderInline(p) : ["\n", ...renderInline(p)]
        )}
      </p>
    );
  }

  return <div className={className}>{blocks}</div>;
}
