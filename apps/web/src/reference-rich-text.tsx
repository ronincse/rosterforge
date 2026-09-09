// Bounded display-only markup. Everything becomes React text/elements; imported
// HTML, URLs, images, scripts, regex and expressions are never executed.
import { createContext, useContext, type ReactNode } from "react";
import { matchTextReference, type ReferenceTextIndex, type TextReference } from "./reference-text-index.js";

export interface ReferenceTextEnvironment {
  readonly index: ReferenceTextIndex;
  readonly open: (target: TextReference, trigger: HTMLButtonElement) => void;
}
export const ReferenceTextContext = createContext<ReferenceTextEnvironment | undefined>(undefined);
interface Run { text: string; style: number }
interface Token { text: string; bit?: number; paired?: boolean; open?: boolean; close?: boolean }
const MAX_TEXT = 32_768;
const MAX_TOKENS = 4_096;

/** Parse independent emphasis flags so the observed crossing ^^**name^^** and
 * nested ***Example:** italic **bold** text* both retain their intended styles.
 * Unpaired markers remain literal. Work is bounded and never recurses on input. */
export function referenceTextRuns(text: string): readonly Run[] {
  if (text.length > MAX_TEXT) return [{ text, style: 0 }];
  const tokens: Token[] = [];
  const pending = new Map<number, Token>();
  const pattern = /\\[\\*_^~]|\*{1,3}|_{1,2}|\^\^|~~|<ins>|<\/ins>|<br\s*\/?\s*>/g;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (tokens.length > MAX_TOKENS) return [{ text, style: 0 }];
    if (match.index > offset) tokens.push({ text: text.slice(offset, match.index) });
    const marker = match[0];
    if (marker.startsWith("\\")) tokens.push({ text: marker.slice(1) });
    else if (marker.startsWith("<br")) tokens.push({ text: "\u2028" });
    else {
      const pieces = marker === "***" ? ["**", "*"] : [marker];
      for (const part of pieces) {
        const bit = part === "**" || part === "__" ? 1 : part === "*" || part === "_" ? 2 : part === "^^" ? 4 : part === "~~" ? 8 : 16;
        const token: Token = { text: part, bit };
        const previous = pending.get(bit);
        const canClose = part !== "<ins>" && match.index > 0 && !/\s/.test(text[match.index - 1]!);
        const canOpen = part !== "</ins>" && match.index + marker.length < text.length && !/\s/.test(text[match.index + marker.length]!);
        if (previous && canClose) { previous.paired = true; previous.open = true; token.paired = true; token.close = true; pending.delete(bit); }
        else if (!previous && canOpen) pending.set(bit, token);
        tokens.push(token);
      }
    }
    offset = match.index + marker.length;
  }
  if (offset < text.length) tokens.push({ text: text.slice(offset) });
  const runs: Run[] = [];
  let style = 0;
  for (const token of tokens) {
    if (token.paired) { style = token.open ? style | token.bit! : style & ~token.bit!; continue; }
    const previous = runs.at(-1);
    if (previous?.style === style) previous.text += token.text;
    else runs.push({ text: token.text, style });
  }
  return runs;
}

function inline(runs: readonly Run[], environment: ReferenceTextEnvironment | undefined, budget: { links: number }, wholeReference = false): ReactNode {
  // Match visible phrases across formatting runs, not each run independently:
  // Deep **Strike** is one reference, but X**Burst** is not the word Burst.
  const text = runs.map(run => run.text).join("");
  if (wholeReference && environment) {
    const candidate = matchTextReference(environment.index, text.trim(), 0);
    const suffix = candidate ? text.trim().slice(candidate.text.length) : "";
    // Keywords are complete labels, not prose: Psychic Assassin must not become
    // a Psychic reference merely because an adjacent keyword used a direct link.
    if (!candidate || (suffix && !/^\s+(?:\d+(?:d\d+)?|d\d+)(?:[+-]\d+)?\+?$/i.test(suffix))) environment = undefined;
  }
  let runIndex = 0;
  let runOffset = 0;
  const styled = (length: number): ReactNode => {
    const pieces: ReactNode[] = [];
    while (length > 0 && runIndex < runs.length) {
      const run = runs[runIndex]!;
      const take = Math.min(length, run.text.length - runOffset);
      const value = run.text.slice(runOffset, runOffset + take);
      let content: ReactNode = value.split("\u2028").map((part, i) => <span key={i}>{i > 0 && <br />}{part}</span>);
      if (run.style & 1) content = <strong>{content}</strong>;
      if (run.style & 2) content = <em>{content}</em>;
      if (run.style & 4) content = <span className="reference-small-caps">{content}</span>;
      if (run.style & 8) content = <s>{content}</s>;
      if (run.style & 16) content = <u>{content}</u>;
      pieces.push(<span key={pieces.length}>{content}</span>);
      length -= take; runOffset += take;
      if (runOffset === run.text.length) { runIndex++; runOffset = 0; }
    }
    return pieces;
  };
  const output: ReactNode[] = [];
  let plainStart = 0;
  for (let i = 0; i < text.length;) {
    const match = environment && budget.links < 256 ? matchTextReference(environment.index, text, i) : undefined;
    if (!match) { i++; continue; }
    if (i > plainStart) output.push(<span key={`text-${i}`}>{styled(i - plainStart)}</span>);
    budget.links++;
    output.push(<button key={i} type="button" className="reference-prose-link" aria-haspopup="dialog" aria-label={`View reference for ${match.text}`} onClick={event => environment!.open(match.target, event.currentTarget)}>{styled(match.text.length)}</button>);
    i += match.text.length;
    plainStart = i;
  }
  if (plainStart < text.length) output.push(<span key="tail">{styled(text.length - plainStart)}</span>);
  return output;
}

/** Render safe reference prose with semantic paragraphs, headings and lists.
 * Oversized input stays visible as plain text instead of partial formatting. */
export function ReferenceRichText({ text, inlineOnly = false, wholeReference = false }: { readonly text: string; readonly inlineOnly?: boolean; readonly wholeReference?: boolean }) {
  const environment = useContext(ReferenceTextContext);
  if (text.length > MAX_TEXT || text.split("\n").length > 512) return <span className="reference-rich-text">{text}</span>;
  const runs = referenceTextRuns(text);
  const budget = { links: 0 };
  if (inlineOnly) return <span className="reference-rich-text">{inline(runs, environment, budget, wholeReference)}</span>;
  const lines: Run[][] = [[]];
  for (const run of runs) run.text.split("\n").forEach((text, index) => {
    if (index) lines.push([]);
    lines.at(-1)!.push({ text, style: run.style });
  });
  const blocks: ReactNode[] = [];
  let paragraph: ReactNode[] = [];
  let list: { content: ReactNode; depth: number }[] = [];
  let ordered = false;
  const flushParagraph = () => { if (paragraph.length) blocks.push(<p key={blocks.length}>{paragraph}</p>); paragraph = []; };
  const flushList = () => {
    interface Item { content: ReactNode; children: Item[] }
    const root: Item[] = [];
    const levels: Item[][] = [root];
    for (const item of list) {
      const depth = Math.min(8, item.depth, levels.length);
      while (levels.length > depth + 1) levels.pop();
      if (depth === levels.length && levels.at(-1)!.length) levels.push(levels.at(-1)!.at(-1)!.children);
      levels.at(-1)!.push({ content: item.content, children: [] });
    }
    const renderItems = (items: Item[], depth = 0): ReactNode => items.map((item, i) => <li key={i}>{item.content}{item.children.length > 0 && depth < 8 && <ul>{renderItems(item.children, depth + 1)}</ul>}</li>);
    if (list.length) blocks.push(ordered ? <ol key={blocks.length}>{renderItems(root)}</ol> : <ul key={blocks.length}>{renderItems(root)}</ul>);
    list = [];
  };
  const tableCells = (line: readonly Run[]) => {
    const cells: Run[][] = [[]];
    for (const run of line) run.text.split("|").forEach((text, i) => { if (i) cells.push([]); cells.at(-1)!.push({text, style:run.style}); });
    if (!cells[0]!.some(r => r.text.trim())) cells.shift();
    if (cells.length && !cells.at(-1)!.some(r => r.text.trim())) cells.pop();
    return cells;
  };
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const line = lines[lineNumber]!;
    const value = line.map(r => r.text).join("");
    const nextLine = lines[lineNumber + 1]?.map(r => r.text).join("");
    if (value.includes("|") && nextLine && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(nextLine)) {
      flushParagraph(); flushList();
      const headers = tableCells(line);
      const rows: Run[][][] = [];
      lineNumber += 2;
      while (lineNumber < lines.length && lines[lineNumber]!.some(r => r.text.includes("|"))) { rows.push(tableCells(lines[lineNumber]!)); lineNumber++; }
      lineNumber--;
      blocks.push(<div className="reference-text-table" role="region" aria-label="Reference table, scroll horizontally" tabIndex={0} key={blocks.length}><table><thead><tr>{headers.map((cell,i)=><th key={i}>{inline(cell,environment,budget)}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{inline(cell,environment,budget)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    const marker = value.match(/^\s*(?:([-+■▪•]+)\s+|(\d+)[.)]\s+|(#{1,6})\s+)/);
    if (!value.trim()) { flushParagraph(); flushList(); continue; }
    if (marker) {
      flushParagraph();
      let remaining = marker[0].length;
      const stripped = line.map(run => { const take = Math.min(remaining, run.text.length); remaining -= take; return { ...run, text: run.text.slice(take) }; });
      const content = inline(stripped, environment, budget);
      if (marker[3]) { flushList(); blocks.push(<div role="heading" aria-level={Math.min(6, marker[3].length)} key={blocks.length}>{content}</div>); }
      else { if (list.length && ordered !== !!marker[2]) flushList(); ordered = !!marker[2]; const indent = value.match(/^\s*/)?.[0].length ?? 0; list.push({ content, depth: Math.max(Math.floor(indent / 2), (marker[1]?.length ?? 1) - 1) }); }
    } else {
      flushList();
      if (paragraph.length) paragraph.push(<br key={`br-${paragraph.length}`} />);
      paragraph.push(<span key={paragraph.length}>{inline(line, environment, budget)}</span>);
    }
  }
  flushParagraph(); flushList();
  return <div className="reference-rich-text">{blocks}</div>;
}
