#!/usr/bin/env bash
# All gates against a running server (default: the dev server): no wrapper layers, reference frames, smoke test, budgets.
URL="${1:-http://localhost:5173/}"
cd "$(dirname "$0")/.." || exit 1
node tools/check-wrappers.mjs; w=$?
node tools/capture-frames.mjs "$URL" qa/captures/verify --compare reference/frames/manifest.json 2>&1 | grep -E 'DIFFERENT|MISSING|frames match|page errors' ; f=${PIPESTATUS[0]}
node tools/smoke-test.mjs "$URL" qa/captures/verify-smoke.json 2>&1 | grep -E '^FAIL|checks passed|FAILED' ; s=${PIPESTATUS[0]}
node tools/scene-stats.mjs "$URL" qa/captures/verify-stats.json --budget perf/budgets.json 2>&1 | grep -E 'OVER|budget|page errors' ; b=${PIPESTATUS[0]}
echo "wrappers=$w frames=$f smoke=$s budgets=$b"; [ $w -eq 0 ] && [ $f -eq 0 ] && [ $s -eq 0 ] && [ $b -eq 0 ]
