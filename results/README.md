# Results inbox

Drop `results-*.json` files here after someone sends back the results file
they downloaded from a standalone quiz you sent them (see the "Download
Results" button on the results screen).

Each file matches the schema produced by `js/app.js`'s `downloadResults()`:

```json
{
  "date": "2026-07-26T20:14:00.000Z",
  "name": "Anna",
  "setId": "2026-07-26",
  "score": 41,
  "total": 50,
  "byCategory": {
    "Science": { "correct": 3, "total": 7 },
    "History & Geography": { "correct": 11, "total": 13 }
  },
  "answers": [
    { "questionId": "d2-01", "category": "Sport", "correct": true }
  ]
}
```

Once a person has one or more results files here, ask Claude Code to use
the `weak-topic-quiz-generator` agent (`.claude/agents/weak-topic-quiz-generator.md`)
to build them a new set biased toward whatever categories they're weakest
in — it reads every file here for that person, aggregates accuracy per
category, and generates + exports a standalone HTML quiz for them.
