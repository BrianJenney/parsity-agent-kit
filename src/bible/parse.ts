import { readFileSync } from "node:fs";

export type Verse = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

export const KJV_PATH = "data/bible/kjv.txt";

const START_MARKER = "*** START OF THE PROJECT GUTENBERG EBOOK";
const END_MARKER = "*** END OF THE PROJECT GUTENBERG EBOOK";
const VERSE_PREFIX = /^(\d+):(\d+)\s+/;
const INLINE_VERSE_BOUNDARY = /\s(?=\d+:\d+\s)/;

export function extractBody(raw: string) {
  const start = raw.indexOf(START_MARKER);
  const end = raw.indexOf(END_MARKER);
  const afterStartLine = raw.indexOf("\n", start) + 1;
  return raw.slice(start === -1 ? 0 : afterStartLine, end === -1 ? raw.length : end);
}

function looksLikeBookTitle(paragraph: string) {
  return paragraph.length < 80 && !/[.!?]$/.test(paragraph);
}

export function parseVerses(body: string): Verse[] {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const verses: Verse[] = [];
  const appendToLastVerse = (text: string) => {
    if (verses.length > 0) verses[verses.length - 1].text += " " + text;
  };
  let currentBook = "Unknown";
  let pendingTitle: string | null = null;

  for (const paragraph of paragraphs) {
    const prefix = paragraph.match(VERSE_PREFIX);

    if (!prefix) {
      if (pendingTitle === null && verses.length > 0 && !looksLikeBookTitle(paragraph)) appendToLastVerse(paragraph);
      else pendingTitle = paragraph;
      continue;
    }

    if (pendingTitle !== null) {
      const startsNewBook = prefix[1] === "1" && prefix[2] === "1";
      if (startsNewBook) currentBook = pendingTitle;
      else appendToLastVerse(pendingTitle);
      pendingTitle = null;
    }

    for (const piece of paragraph.split(INLINE_VERSE_BOUNDARY)) {
      const match = piece.match(VERSE_PREFIX);
      if (!match) {
        appendToLastVerse(piece);
        continue;
      }
      verses.push({
        book: currentBook,
        chapter: Number(match[1]),
        verse: Number(match[2]),
        text: piece.replace(VERSE_PREFIX, "").trim(),
      });
    }
  }

  return verses;
}

export function loadVerses(path = KJV_PATH) {
  return parseVerses(extractBody(readFileSync(path, "utf-8")));
}
