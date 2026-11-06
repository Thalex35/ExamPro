import type { ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

type InlineToken = {
  type: "text" | "code" | "strong" | "em" | "link" | "math";
  value: string;
  href?: string;
};

function renderMath(value: string, displayMode: boolean) {
  return katex.renderToString(value, {
    displayMode,
    throwOnError: false,
    trust: false,
    maxExpand: 1000,
    maxSize: 10,
  });
}

function tokenizeInline(value: string): InlineToken[] {
  const pattern =
    /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\)|\$[^$\n]+\$)/g;
  const tokens: InlineToken[] = [];
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ type: "text", value: value.slice(cursor, index) });
    if (token.startsWith("`")) {
      tokens.push({ type: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("**") || token.startsWith("__")) {
      tokens.push({ type: "strong", value: token.slice(2, -2) });
    } else if (token.startsWith("*") || token.startsWith("_")) {
      tokens.push({ type: "em", value: token.slice(1, -1) });
    } else if (token.startsWith("$")) {
      tokens.push({ type: "math", value: token.slice(1, -1) });
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        let href: string | undefined;
        try {
          const parsed = new URL(link[2]!);
          if (parsed.protocol === "https:" || parsed.protocol === "http:") href = parsed.href;
        } catch {
          href = undefined;
        }
        tokens.push(
          href ? { type: "link", value: link[1]!, href } : { type: "text", value: token },
        );
      } else {
        tokens.push({ type: "text", value: token });
      }
    }
    cursor = index + token.length;
  }
  if (cursor < value.length) tokens.push({ type: "text", value: value.slice(cursor) });
  return tokens;
}

function renderInline(value: string): ReactNode[] {
  return tokenizeInline(value).map((token, index) => {
    switch (token.type) {
      case "code":
        return (
          <code key={index} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.92em]">
            {token.value}
          </code>
        );
      case "strong":
        return <strong key={index}>{token.value}</strong>;
      case "em":
        return <em key={index}>{token.value}</em>;
      case "math":
        return (
          <span
            key={index}
            role="math"
            aria-label={token.value}
            className="whitespace-nowrap"
            dangerouslySetInnerHTML={{
              __html: renderMath(token.value, false),
            }}
          />
        );
      case "link":
        return (
          <a
            key={index}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-deep underline underline-offset-2"
          >
            {token.value}
          </a>
        );
      default:
        return token.value;
    }
  });
}

function renderBlockMath(value: string) {
  return (
    <div
      role="math"
      aria-label={value.trim()}
      className="my-5 overflow-x-auto rounded-xl border border-border bg-muted/50 px-4 py-3 text-center text-base text-heading"
      dangerouslySetInnerHTML={{
        __html: renderMath(value.trim(), true),
      }}
    />
  );
}

export function MarkdownLesson({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index]!.trim();
    if (!line) {
      index++;
      continue;
    }
    if (line.startsWith("$$")) {
      const formula = [line.slice(2)];
      if (formula[0]!.endsWith("$$")) {
        formula[0] = formula[0]!.slice(0, -2);
      } else {
        index++;
        while (index < lines.length && !lines[index]!.includes("$$")) {
          formula.push(lines[index]!);
          index++;
        }
        if (index < lines.length) formula.push(lines[index]!.replace("$$", ""));
      }
      blocks.push(<div key={key++}>{renderBlockMath(formula.join("\n"))}</div>);
      index++;
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const Heading = `h${heading[1]!.length + 1}` as "h2" | "h3" | "h4";
      blocks.push(
        <Heading key={key++} className="mb-2 mt-7 font-bold leading-snug text-heading first:mt-0">
          {renderInline(heading[2]!)}
        </Heading>,
      );
      index++;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line)) {
      blocks.push(<hr key={key++} className="my-6 border-border" />);
      index++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index]!)) {
        quote.push(lines[index]!.replace(/^>\s?/, ""));
        index++;
      }
      const isCallout = /^\[(definition|définition|conseil|astuce)\]/i.test(quote[0] ?? "");
      blocks.push(
        <blockquote
          key={key++}
          className={`my-4 rounded-r-xl border-l-4 px-4 py-3 text-base ${
            isCallout
              ? "border-brand bg-accent/40 text-heading"
              : "border-border bg-muted/40 text-muted-foreground"
          }`}
        >
          {quote.map((text, quoteIndex) => (
            <p key={quoteIndex} className="leading-8">
              {renderInline(text.replace(/^\[(?:definition|définition|conseil|astuce)\]\s*/i, ""))}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }
    if (/^\s*[-*+]\s+/.test(lines[index]!)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index]!)) {
        items.push(lines[index]!.replace(/^\s*[-*+]\s+/, ""));
        index++;
      }
      blocks.push(
        <ul key={key++} className="my-3 list-disc space-y-1.5 pl-6 marker:text-brand">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="pl-1 leading-8">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(lines[index]!)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index]!)) {
        items.push(lines[index]!.replace(/^\s*\d+[.)]\s+/, ""));
        index++;
      }
      blocks.push(
        <ol
          key={key++}
          className="my-3 list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-brand"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="pl-1 leading-8">
              {renderInline(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph = [line];
    index++;
    while (
      index < lines.length &&
      lines[index]!.trim() &&
      !/^(#{1,3}\s|>|[-*+]\s|\d+[.)]\s|\$\$|---+$|\*\*\*+$)/.test(lines[index]!.trim())
    ) {
      paragraph.push(lines[index]!.trim());
      index++;
    }
    blocks.push(
      <p key={key++} className="my-3 leading-8 text-foreground">
        {paragraph.map((text, textIndex) => (
          <span key={textIndex}>
            {textIndex > 0 && " "}
            {renderInline(text)}
          </span>
        ))}
      </p>,
    );
  }

  return <div className="max-w-3xl text-[1.05rem]">{blocks}</div>;
}
