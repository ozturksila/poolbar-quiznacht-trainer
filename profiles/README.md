# Profiles

One `<name>_profile.md` file per person, auto-generated from their
`results/*.json` files by `scripts/build_profile.py <name>` — never
hand-edited (regenerating overwrites it).

Each profile lists their round history, cumulative accuracy per category,
and their weakest categories. The `weak-topic-quiz-generator` agent builds
and reads this before generating a personalized set for that person.

To (re)build one manually:

```bash
python3 scripts/build_profile.py Anna
```
