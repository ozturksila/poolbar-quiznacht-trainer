# Poolbar Quiznacht Trainer

A local, client-side multiple-choice quiz trainer for prepping for the weekly
pub quiz at the Poolbar Festival in Vorarlberg, Austria.

## Running it

No build step, no server-side code. Because it loads question data via
`fetch()`, open it through a local dev server rather than `file://`:

```bash
cd /Users/silaozturk/Workspace/Claude/quiztrainer
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

## Project structure

```
index.html                entry point (dev mode: loads sets via fetch())
css/style.css              dark pool-felt theme
js/quiz.js                  quiz engine: loading sets, shuffling, scoring, per-category stats
js/storage.js               score history via localStorage
js/app.js                    screen wiring (start / quiz / results / history), name capture, results export
questions/manifest.json      list of available question sets
questions/*.json             one file per date's round of questions
questions/asked-log.md       auto-generated ledger of every question ever asked (dedup reference)
questions/excluded-topics.md hand-maintained list of subjects the real quiz already asked — permanently off-limits
scripts/build_standalone.py  bundles one question set into a single sendable HTML file
scripts/build_asked_log.py   regenerates questions/asked-log.md from questions/*.json
scripts/build_profile.py     aggregates one person's results/*.json into profiles/<name>_profile.md
dist/*.html                  generated standalone quiz files (git-ignore-worthy, regenerate anytime)
results/*.json               results files people send back after playing a standalone quiz
profiles/*_profile.md        per-person round history + weak-category breakdown, auto-generated
```

Sets are always identified by date, never sequential numbering — no
"Day 1," "Day 2," etc. anywhere (ids, filenames, or UI labels).

## Sending a quiz to someone else

Every generated set can be exported as one self-contained `.html` file —
no server, no fetch, questions embedded inline — that opens by double-
click or as an email/chat attachment:

```bash
python3 scripts/build_standalone.py questions/2026-07-25.json
```

This writes `dist/2026-07-25.html`. Send that file directly; the
`daily-quiz-generator` and `weak-topic-quiz-generator` agents both do this
step automatically whenever they generate a set.

The quiz asks for the player's name before starting, and its results
screen has a **Download Results** button that saves a small
`results-<name>-<date>.json` file (score, per-category accuracy, every
question answered right/wrong) — fully offline, no server involved. Ask
the person to send that file back to you however's convenient (chat,
email, AirDrop), then drop it in `results/` here.

Once someone has results on file, ask Claude Code to use the
`weak-topic-quiz-generator` agent to build them a new set biased toward
whatever categories they're weakest in, and export it the same way. There's
no automatic phone-home — a static HTML file can't push data anywhere on
its own — so this handoff is manual by design, but everything else
(grading, export, weak-spot targeting) happens for you.

That agent also (re)builds `profiles/<name>_profile.md` — a running,
human-readable summary of that person's round history and cumulative
accuracy per category — so you can glance at who's weak where without
digging through raw results files.

## Adding a new day's question set

The easiest way is to ask Claude Code to use the `daily-quiz-generator`
agent (`.claude/agents/daily-quiz-generator.md`) — it reads every past set
to match the house style and avoid repeating subjects, and writes the new
file plus the manifest entry for you. It's biased toward History &
Geography (favoring non-European continents) and toward classical music
within Art & Culture, per the current prep priorities.

Questions use six categories: **Sport, Movies & TV, Art & Culture,
Science, History & Geography, General Knowledge**. There is deliberately
no "German Language" category — the quiz is run in German for native
German speakers, so German is the medium, not a subject.

To do it by hand instead:

1. Create a new JSON file in `questions/`, named by date, e.g.
   `questions/2026-08-01.json`. Each entry follows this schema:

   ```json
   {
     "id": "2026-08-01-01",
     "category": "Sport",
     "question": "Context-first question text ending in the actual ask?",
     "options": [
       { "text": "Option A", "info": "One or two sentences of context/trivia." },
       { "text": "Option B", "info": "..." },
       { "text": "Option C", "info": "..." },
       { "text": "Option D", "info": "..." }
     ],
     "correctIndex": 0,
     "dateAdded": "2026-08-01"
   }
   ```

   Ids and manifest labels are always date-based (`YYYY-MM-DD-NN`) — never
   sequential "Day 1 / Day 2" naming.

   - `correctIndex` is the index (0-3) of the correct option **in this
     file's option order**. The app randomizes which on-screen position
     (A/B/C/D) the correct answer lands in every time the question is
     shown, so you don't need to shuffle anything yourself here.
   - Every option needs its own `info` blurb — it's revealed for all four
     options after answering, not just the correct one.
   - Keep questions context-first: a sentence or two of backstory/clue
     before the actual question.
   - **Never write language-learning questions.** No "what does this
     German word/surname mean," no translations, no etymology used as the
     clue, no vocabulary or grammar — the players are native German
     speakers, so those test nothing. Ask about history, art, science and
     the like instead.
   - Optional `audio` field for audio-guessing questions ("guess the
     composer/piece," "guess the original behind this cover"):
     `"audio": { "url": "https://...", "credit": "Public domain via Wikimedia Commons" }`.
     Only ever use a real, verified, freely-licensed recording (Wikimedia
     Commons / IMSLP for public-domain classical, Free Music Archive for
     CC-licensed covers) — never a fabricated or unverified URL. Omit the
     field entirely for ordinary text-only questions.
   - Music/entertainment questions aren't only classical anymore — bands
     and their members/personas, songs used in musicals, and unmade or
     nearly-unmade films/series/directors are all fair game alongside
     classical music and film/TV trivia.

2. Add an entry to `questions/manifest.json`:

   ```json
   { "id": "2026-08-01", "file": "2026-08-01.json", "label": "2026-08-01", "questionCount": 50 }
   ```

3. Reload the app — the new set shows up as a selectable checkbox on the
   start screen. Multiple sets can be selected at once to combine them into
   one larger round.

## Not built yet (structured to add later)

- Category-based practice filtering (`category` is already on every
  question, so filtering the pool before a round is a small addition).
- A stats view broken down by category, using the same history data
  already collected in `localStorage`.
