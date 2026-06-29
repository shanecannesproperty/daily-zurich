import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, citySlug, siteName } from "@/lib/city";

export const Route = createFileRoute("/puzzles")({
  head: () => ({
    meta: buildMeta({
      title: `Daily Puzzles & Crosswords | ${siteName()}`,
      description: `Free daily crossword, word scramble and quick quiz for ${cityName()} readers. New puzzles every morning.`,
      path: "/puzzles",
    }),
    links: canonicalLinks("/puzzles"),
  }),
  component: PuzzlesPage,
});

// Deterministic daily index based on the day-of-year so the puzzle is the
// same for every reader on a given day and rotates at local midnight.
function dayIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Canberra-specific trivia. Used only on the Canberra build; other cities get
// the neutral, city-agnostic sets below so the page is clean from
// VITE_SITE_CITY alone.
const CANBERRA_SCRAMBLES: { word: string; hint: string }[] = [
  { word: "CANBERRA", hint: "The national capital." },
  { word: "MOLONGLO", hint: "River through the city." },
  { word: "BRADDON", hint: "Inner-north suburb famed for cafes." },
  { word: "TELOPEA", hint: "ACT floral emblem." },
  { word: "NAMADGI", hint: "National park to the south." },
  { word: "GUNGAHLIN", hint: "Northern town centre." },
  { word: "TUGGERANONG", hint: "Southern town centre." },
];

const CANBERRA_QUIZ: { q: string; a: string; choices: string[] }[] = [
  {
    q: "Which lake sits at the heart of Canberra?",
    a: "Lake Burley Griffin",
    choices: ["Lake Tuggeranong", "Lake Burley Griffin", "Lake George", "Lake Ginninderra"],
  },
  {
    q: "Which mountain offers the best city lookout?",
    a: "Mount Ainslie",
    choices: ["Black Mountain", "Mount Ainslie", "Mount Majura", "Red Hill"],
  },
  {
    q: "Floriade is held in which park each spring?",
    a: "Commonwealth Park",
    choices: ["Glebe Park", "Haig Park", "Commonwealth Park", "Lennox Gardens"],
  },
];

const CANBERRA_CROSSWORD = {
  across: [
    { n: 1, clue: "ACT's lower-house chamber (10)" },
    { n: 4, clue: "Suburb on the shore of the lake, home to the gallery (5)" },
    { n: 6, clue: "Canberra's AFL side, the ___ (5)" },
  ],
  down: [
    { n: 1, clue: "Brindabella feature visible from most of the city (6)" },
    { n: 2, clue: "Spring flower festival on the lake (8)" },
    { n: 3, clue: "Capital's NRL side (6)" },
  ],
};

// City-agnostic puzzles: general-knowledge words and clues with no city
// specifics, so they read correctly on any non-Canberra build.
const GENERIC_SCRAMBLES: { word: string; hint: string }[] = [
  { word: "WEEKEND", hint: "Saturday and Sunday." },
  { word: "MORNING", hint: "The start of the day." },
  { word: "HEADLINE", hint: "Top of the news page." },
  { word: "WEATHER", hint: "What the forecast describes." },
  { word: "HARBOUR", hint: "Where boats shelter." },
  { word: "EDITION", hint: "A single day's issue of a paper." },
  { word: "JOURNAL", hint: "Another word for a newspaper." },
];

const GENERIC_QUIZ: { q: string; a: string; choices: string[] }[] = [
  {
    q: "How many states make up Australia?",
    a: "Six",
    choices: ["Five", "Six", "Seven", "Eight"],
  },
  {
    q: "What is the national floral emblem of Australia?",
    a: "Golden wattle",
    choices: ["Waratah", "Golden wattle", "Kangaroo paw", "Banksia"],
  },
  {
    q: "Which ocean lies to the west of Australia?",
    a: "Indian Ocean",
    choices: ["Pacific Ocean", "Indian Ocean", "Southern Ocean", "Arctic Ocean"],
  },
];

const GENERIC_CROSSWORD = {
  across: [
    { n: 1, clue: "Frozen water (3)" },
    { n: 4, clue: "Opposite of night (3)" },
    { n: 6, clue: "Printed news sheet (5)" },
  ],
  down: [
    { n: 1, clue: "Coldest season of the year (6)" },
    { n: 2, clue: "Midday meal (5)" },
    { n: 3, clue: "The planet we live on (5)" },
  ],
};

function scramble(word: string, seed: number): string {
  const letters = word.split("");
  // Deterministic Fisher-Yates with a seeded PRNG.
  let s = seed + 1;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  const out = letters.join("");
  return out === word ? scramble(word, seed + 7) : out;
}

function PuzzlesPage() {
  // Resolve the city per render (not at module load) so a single-deploy,
  // host-resolved non-Canberra site never gets the Canberra puzzle set.
  const isCanberra = citySlug() === "canberra";
  const SCRAMBLES = isCanberra ? CANBERRA_SCRAMBLES : GENERIC_SCRAMBLES;
  const QUIZ = isCanberra ? CANBERRA_QUIZ : GENERIC_QUIZ;
  const CROSSWORD_CLUES = isCanberra ? CANBERRA_CROSSWORD : GENERIC_CROSSWORD;

  const idx = dayIndex();
  const scrambleItem = SCRAMBLES[idx % SCRAMBLES.length];
  const quizItem = QUIZ[idx % QUIZ.length];
  const scrambled = useMemo(
    () => scramble(scrambleItem.word, idx),
    [scrambleItem.word, idx],
  );

  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [quizPick, setQuizPick] = useState<string | null>(null);

  const correct = guess.trim().toUpperCase() === scrambleItem.word;
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <SiteHeader />
      <main className="container-read py-10">
        <header className="border-b border-ink/15 pb-6">
          <p className="kicker">Daily puzzles</p>
          <h1 className="h1-news mt-2">Puzzles &amp; Crosswords</h1>
          <p className="dek mt-3">
            A fresh crossword, scramble and quick quiz for {cityName()} every morning. {today}.
          </p>
        </header>

        <section className="mt-10">
          <h2 className="h2-news">Word scramble</h2>
          <p className="mt-2 text-sm text-ink/70">
            {isCanberra ? `Unscramble today's ${cityName()} word.` : "Unscramble today's word."}
          </p>
          <div className="mt-4 border border-ink/20 bg-surface p-5">
            <p className="font-serif text-3xl tracking-[0.3em]">{scrambled}</p>
            <p className="mt-2 text-sm italic text-ink/70">Clue: {scrambleItem.hint}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="scramble-guess" className="sr-only">
                Your answer
              </label>
              <input
                id="scramble-guess"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                className="border border-ink/30 bg-bg px-3 py-2 font-sans text-sm uppercase tracking-wider"
                placeholder="Your answer"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="border border-ink/40 px-3 py-2 text-sm hover:bg-ink hover:text-bg"
              >
                Reveal
              </button>
              {guess && (
                <span className="text-sm">
                  {correct ? "✓ Correct" : revealed ? `Answer: ${scrambleItem.word}` : "Keep trying"}
                </span>
              )}
              {!guess && revealed && (
                <span className="text-sm">Answer: {scrambleItem.word}</span>
              )}
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="h2-news">Quick crossword</h2>
          <p className="mt-2 text-sm text-ink/70">
            {isCanberra
              ? `A short ${cityName()}-themed crossword. Print and solve, or work it out in your head.`
              : "A short general-knowledge crossword. Print and solve, or work it out in your head."}
          </p>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div className="border border-ink/20 bg-surface p-5">
              <h3 className="font-serif text-xl">Across</h3>
              <ol className="mt-2 space-y-2 text-sm">
                {CROSSWORD_CLUES.across.map((c) => (
                  <li key={`a-${c.n}`}>
                    <span className="font-semibold">{c.n}.</span> {c.clue}
                  </li>
                ))}
              </ol>
            </div>
            <div className="border border-ink/20 bg-surface p-5">
              <h3 className="font-serif text-xl">Down</h3>
              <ol className="mt-2 space-y-2 text-sm">
                {CROSSWORD_CLUES.down.map((c) => (
                  <li key={`d-${c.n}`}>
                    <span className="font-semibold">{c.n}.</span> {c.clue}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="h2-news">Quiz of the day</h2>
          <div className="mt-4 border border-ink/20 bg-surface p-5">
            <p className="font-serif text-xl">{quizItem.q}</p>
            <ul className="mt-4 space-y-2">
              {quizItem.choices.map((choice) => {
                const isPick = quizPick === choice;
                const isCorrect = quizPick && choice === quizItem.a;
                return (
                  <li key={choice}>
                    <button
                      type="button"
                      onClick={() => setQuizPick(choice)}
                      className={`w-full border px-3 py-2 text-left text-sm ${
                        isCorrect
                          ? "border-ink bg-ink text-bg"
                          : isPick
                            ? "border-accent text-accent"
                            : "border-ink/30 hover:border-ink"
                      }`}
                    >
                      {choice}
                      {isPick && !isCorrect && " — try again"}
                      {isCorrect && " — correct"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="mt-12 border-t border-ink/15 pt-6">
          <p className="text-sm text-ink/70">
            Puzzles refresh every morning at midnight. Like the daily brief? Subscribe to the {siteName()} newsletter to get them in your inbox.
          </p>
        </section>
      </main>
    </>
  );
}
