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
questions/*.json             one file per day/round of questions
scripts/build_standalone.py  bundles one question set into a single sendable HTML file
dist/*.html                  generated standalone quiz files (git-ignore-worthy, regenerate anytime)
results/*.json               results files people send back after playing a standalone quiz
```

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

## Adding a new day's question set

The easiest way is to ask Claude Code to use the `daily-quiz-generator`
agent (`.claude/agents/daily-quiz-generator.md`) — it reads every past set
to match the house style and avoid repeating subjects, and writes the new
file plus the manifest entry for you. It's biased toward History &
Geography (favoring non-European continents) and toward classical music
within Art & Culture / German Language, per the current prep priorities.

To do it by hand instead:

1. Create a new JSON file in `questions/`, named by date, e.g.
   `questions/2026-08-01.json`. Each entry follows this schema:

   ```json
   {
     "id": "d2-01",
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

   - `correctIndex` is the index (0-3) of the correct option **in this
     file's option order**. The app randomizes which on-screen position
     (A/B/C/D) the correct answer lands in every time the question is
     shown, so you don't need to shuffle anything yourself here.
   - Every option needs its own `info` blurb — it's revealed for all four
     options after answering, not just the correct one.
   - Keep questions context-first: a sentence or two of backstory/clue
     before the actual question. German-language questions should hinge on
     what a German word or surname means, not grammar drills.

2. Add an entry to `questions/manifest.json`:

   ```json
   { "id": "2026-08-01", "file": "2026-08-01.json", "label": "Day 2 — 2026-08-01", "questionCount": 50 }
   ```

3. Reload the app — the new set shows up as a selectable checkbox on the
   start screen. Multiple sets can be selected at once to combine them into
   one larger round.

## Not built yet (structured to add later)

- Category-based practice filtering (`category` is already on every
  question, so filtering the pool before a round is a small addition).
- A stats view broken down by category, using the same history data
  already collected in `localStorage`.
