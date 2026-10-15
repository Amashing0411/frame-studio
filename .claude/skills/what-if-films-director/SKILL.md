---
name: what-if-films-director
description: "Project entry point for directing a What If film in Frame Studio. Loads the project's own whatif-director rules (scenario schema v7) from skills/whatif-director and runs the full checklist: fact brief, beat sheet, scenario JSON, validation, audit. Use for WHATIF: ideas, scripts, shot lists, beat sheets or fixing scenario JSON in this repo."
---

# What If Films Director (Frame Studio)

This skill is a thin wrapper. **The rules live in one place: `skills/whatif-director/` in this repo.** Do not copy, restate, relax or change them here; if this file and the source ever disagree, the source wins.

## 1. Load the source of truth first

1. Read `skills/whatif-director/SKILL.md` in full: workflow, schema, vocabulary, story and pacing rules, content rules, output format, example and validator.
2. Read `skills/whatif-director/references/vocabulary.json` (readable copy: `vocabulary.md`). It is generated from the running engine by `tools/extract-vocabulary.mjs`; if it disagrees with the SKILL.md lists, the JSON is newer.
3. If the `fact-brief` skill is available, follow it for step 1 of the workflow, as the source says.

**Schema version:** use the `schema_version` the source skill specifies (7 at the time of writing). If a request names a different schema version, say in one line that the engine uses the version from the source skill and continue with it.

## 2. Never touch the engine

You write scenarios, never engine code. Do not edit anything under `src/`, `reference/`, `tools/`, `index.html`, `classic.config.js`, the built-in stories or any existing scenario. Engine changes belong to the `film-engine-maintainer` skill and need the user's request. Put scratch files you create (scenario JSON, the validator script) in `qa/skill-tests/`, which is gitignored.

## 3. Checklist before you answer

Every item below is defined in the source skill; the section name is where to look. Confirm each one against the source, not against this list.

| Requirement | Source section |
|---|---|
| Fact brief, facts labeled F1, F2, ... (real world only) | Workflow step 1; Content rules |
| Cast & set table | Workflow step 2; Placing the cast |
| Beat sheet: cold-open hook, re-hook about every 30 s, rising tension, safety takeaway | Story and pacing rules; Content rules (end card) |
| Scenario JSON that matches the schema exactly, no invented fields | Scenario schema; Core vocabulary; v7 vocabulary |
| Only approved camera presets and moves, events, sfx keywords, crowd/emotion/zombie behaviors, asset states and expressions | Core vocabulary; v7 vocabulary; Asset list |
| Shot length and pacing limits, closeup count, a human reaction before the hazard is explained | Story and pacing rules |
| Fact captions carry a unique `fact_id`; narration makes no real-world claims; banned words; prohibited content | Content rules |
| End card with the real safety action and the "illustrative" or "fictional scenario" line | Content rules |
| Unsupported hazard: list it under MISSING CAPABILITIES, adapt to the nearest supported hazard or a hazard "none" story, and say which | Content rules (supported hazards); Workflow step 7 |
| Over 4 minutes: split into parts of at most 3 minutes with continuous timestamps | Story and pacing rules |
| Validate, then audit with real numbers: shot count, every shot length, length trend, closeups with subject and emotion, crowd sequence, re-hook times, fact IDs, banned-word check. Anything not run says NOT CHECKED | Workflow steps 5-6; Validator |
| Output headings and order | Output format |

## 4. When the rules need to change

If the user wants a production rule changed, or the engine gains new vocabulary, update `skills/whatif-director/` (the maintainer's `tools/extract-vocabulary.mjs` regenerates the vocabulary), not this wrapper.
