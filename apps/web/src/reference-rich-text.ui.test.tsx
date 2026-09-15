// @vitest-environment jsdom
// Synthetic markup and safety cases. No third-party prose fixtures.
import { afterEach, expect, it } from "vitest";
import { parseBattleScribeXml } from "@rosterforge/battlescribe-data";
import { sourceId } from "@rosterforge/foundation";
import { cleanup, render } from "@testing-library/react";
import { ReferenceRichText, referenceTextRuns, ReferenceTextContext } from "./reference-rich-text.js";
import { createReferenceTextIndex, type TextReference } from "./reference-text-index.js";
afterEach(cleanup);

it("renders crossing small caps/bold and nested italic examples without losing words", () => {
  const text = "^^**Example faction^^**. ***Example:** an **important** roll.*\n\n**Two\nlines.**";
  const { container } = render(<ReferenceRichText text={text} />);
  expect(container.querySelector(".reference-small-caps strong")?.textContent).toBe("Example faction");
  expect(container.querySelector("em strong")?.textContent).toBe("Example:");
  expect(container.textContent).not.toMatch(/[\^*]/);
  expect(container.textContent).toContain("important roll.");
  expect(container.querySelectorAll("p")).toHaveLength(2);
  expect(referenceTextRuns("* / D6* / unmatched **").map(r => r.text).join("")).toBe("* / D6* / unmatched **");
});

it("renders safe lists/headings and only exact allowlisted inline tags", () => {
  const { container } = render(<ReferenceRichText text={'# Example\n\n- First **choice**\n- Second\n\n1. Roll\n2. Resolve\n\n<ins>Underlined</ins><br>Next <FACTION> <img src=x onerror=alert(1)> <script>alert(1)</script> \\*literal\\*'} />);
  expect(container.querySelector('[role="heading"]')?.textContent).toBe("Example");
  expect(container.querySelectorAll("li")).toHaveLength(4);
  expect(container.querySelector("u")?.textContent).toBe("Underlined");
  expect(container.querySelector("img,script,a")).toBeNull();
  expect(container.textContent).toContain("<FACTION>");
  expect(container.textContent).toContain("*literal*");
});

it("bounds oversized and marker-heavy data without dropping source text", () => {
  const large = "**x**".repeat(10_000);
  const { container } = render(<ReferenceRichText text={large} />);
  expect(container.textContent).toBe(large);
  expect(container.querySelectorAll("strong")).toHaveLength(0);
  const markers = "**x** ".repeat(1_200);
  expect(referenceTextRuns(markers).map(r => r.text).join("")).toBe(markers);
});

it("links full phrases across styles without creating false word boundaries", () => {
  const target: TextReference = { name: "Deep Strike", rules: [], profiles: [], sourceOnly: true };
  const index = createReferenceTextIndex(new Map([["deep strike", target], ["burst", {...target,name:"Burst"}]]));
  const { container } = render(<ReferenceTextContext.Provider value={{index,open:()=>undefined}}><ReferenceRichText text="Deep **Strike**; X**Burst**; **Burst**." /></ReferenceTextContext.Provider>);
  expect([...container.querySelectorAll("button")].map(b=>b.textContent)).toEqual(["Deep Strike", "Burst"]);
  expect(container.querySelector("button strong")?.textContent).toBe("Strike");
});

it("renders pipe tables and NBSP-indented sublists as bounded semantic structures", () => {
  const {container} = render(<ReferenceRichText text={'| Roll | Result |\n|---|---|\n| 1 | **First**<br>Second |\n\n- Parent\n\u00a0\u00a0- Child\n- Next'} />);
  expect(container.querySelectorAll("table")).toHaveLength(1);
  expect(container.querySelector("td strong")?.textContent).toBe("First");
  expect(container.querySelector("td br")).toBeTruthy();
  expect(container.querySelector("li ul li")?.textContent).toBe("Child");
});

it("fails closed when an entire reference dictionary exceeds its budget", () => {
  const target: TextReference = { name: "Example", rules: [], profiles: [], sourceOnly: true };
  const index = createReferenceTextIndex(new Map(Array.from({length:8193}, (_,i)=>[`reference ${i}`, target])));
  expect(index.limited).toBe(true);
  expect(index.names.size).toBe(0);
});

it("keeps XML-decoded dangerous text inert through ingestion, projection and the real renderer", () => {
  const dangerous = '&lt;script&gt;throw 1&lt;/script&gt; &lt;img src="https://invalid.test/probe" onerror="throw 1"&gt; &lt;a href="javascript:throw 1"&gt;link&lt;/a&gt; &lt;svg onload="throw 1"&gt; &lt;iframe src="https://invalid.test/frame"&gt; &amp;quot; &#38;quot;';
  const parsed = parseBattleScribeXml(new TextEncoder().encode(`<catalogue id="c" name="Name"><rules><rule id="r" name="Rule"><description>${dangerous} &lt;ins&gt;Allowed&lt;/ins&gt;&lt;br/&gt;End<![CDATA[ &quot;]]></description></rule></rules></catalogue>`), { source: { sourceId: sourceId("fiction:render"), filename: "render.cat", kind: "synthetic", importedAt: "2026-09-14T00:00:00Z" } });
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  const text = parsed.value.projection.rules[0]!.description!;
  const { container } = render(<ReferenceRichText text={text} />);
  expect(container.querySelector("script,img,a,svg,iframe,object,embed,link,style")).toBeNull();
  expect(container.querySelector("[onerror],[onload],[href],[src]")).toBeNull();
  expect(container.textContent).toContain('<script>throw 1</script>');
  expect(container.textContent).toContain('javascript:throw 1');
  expect(container.textContent).toContain('&quot; &quot;');
  expect(container.textContent).toContain('End &quot;');
  expect(container.querySelector("u")?.textContent).toBe("Allowed");
  expect(container.querySelectorAll("br")).toHaveLength(1);
});
