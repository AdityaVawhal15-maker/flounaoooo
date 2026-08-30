import type { Block } from "@/lib/legal/documents";

// Renders one policy document.
//
// The source documents lean hard on bullet lists, several of them thirty items
// long. Rendered as plain bullets that is a wall nobody reads, and a policy
// nobody reads fails at the only thing it exists to do, so the list markers are
// quiet and the spacing does the separating.
//
// Bold is the one inline mark carried through from the source, via
// dangerouslySetInnerHTML. The input is our own policy text, checked into the
// repo and not user-supplied, so there is no untrusted path into this. The
// converter also strips markdown links rather than passing hrefs through, which
// keeps that from changing quietly later.

function Inline({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function PolicyBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (b.t === "h") {
          // Level 2 is a numbered section, level 3 a subsection inside it.
          // Anything deeper is flattened by the converter.
          return b.level <= 2 ? (
            <h2
              key={i}
              className="mt-9 border-t border-line pt-6 text-[18px] font-bold leading-snug text-ink first:mt-0 first:border-0 first:pt-0"
            >
              <Inline html={b.text} />
            </h2>
          ) : (
            <h3 key={i} className="mt-6 text-[15px] font-bold text-ink">
              <Inline html={b.text} />
            </h3>
          );
        }

        if (b.t === "p") {
          return (
            <p key={i} className="text-[14px] leading-[1.65] text-cocoa">
              <Inline html={b.text} />
            </p>
          );
        }

        if (b.t === "ul") {
          return (
            <ul key={i} className="space-y-1.5">
              {b.items.map((item, j) => (
                <li
                  key={j}
                  className="flex gap-2.5 text-[14px] leading-[1.6] text-cocoa"
                >
                  <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-accent/50" />
                  <span className="min-w-0">
                    <Inline html={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        // Tables carry the numbers people actually come here for: response
        // times, refund windows. They scroll inside their own box so a wide
        // one never makes the whole page scroll sideways on a phone.
        return (
          <div key={i} className="-mx-1 overflow-x-auto pb-1">
            <table className="w-full min-w-[420px] border-collapse text-[13px]">
              <thead>
                <tr>
                  {b.head.map((h, j) => (
                    <th
                      key={j}
                      className="border-b border-line px-2.5 py-2 text-left font-bold text-ink"
                    >
                      <Inline html={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, j) => (
                  <tr key={j}>
                    {row.map((cell, k) => (
                      <td
                        key={k}
                        className="border-b border-line/60 px-2.5 py-2 align-top text-cocoa"
                      >
                        <Inline html={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
