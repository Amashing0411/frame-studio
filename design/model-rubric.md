# Model review rubric (Step 6)

Used by the blind reviewers of the Model Lab. Each candidate is a contact sheet of one model under identical lights:
front, 3/4, side, back and a face close-up. Candidates are identified only by a code (`V-xx` = the market vendor,
a person; `O-xx` = the octopus customer, a friendly creature).

**What the models are for.** Characters in short 9:16 phone films (YouTube Shorts / TikTok). A figure is often only
1/6 of the frame tall (320 px of 1920), so it must read its shape, pose and expression at that size. The target look
is a cohesive, appealing stylised toy-like cast that a viewer would find charming, not creepy or generic. Any
style (smooth, low-poly, chibi, realistic-ish) may score well if it serves that purpose.

Score each criterion **1 to 10** using the anchors (2 = broken, 4 = weak, 6 = acceptable, 8 = good, 10 = excellent;
odd numbers are in between). Judge only what the images and numbers show.

| Criterion | What to look at | 2 | 6 | 10 |
|---|---|---|---|---|
| **Silhouette** | Does the outline read clearly and distinctly from every view, including tiny at 1/6 of a phone frame? Distinct head/body/limb masses, no confusing overlaps. | Blob or tangle; unclear what it is from some views | Readable but generic or muddled from one view | Instantly readable and characterful from every angle |
| **Proportions** | Coherent, intentional proportions for the style (head/body/limb ratios, widths, limb thickness). | Parts look wrong-sized or accidental | Coherent but stiff or slightly off somewhere | Deliberate, harmonious, supports the character |
| **Face** | Eyes, brows, mouth: placement, readability at small size, expressiveness, no uncanny or dead look, clean construction (no floating or buried parts). | Unreadable, dead or broken face | Readable but bland or with small construction flaws | Clear, appealing, expressive, clean |
| **Hands** | People: hand shape, size and attachment. Octopus: the arm tips and suckers (shape, taper, curl, how they meet the body). | Missing, broken, spiky or blocky lumps | Simple but acceptable | Well-shaped, clean, appealing |
| **Appeal** | Overall charm: would a viewer like this character in a short film? | Ugly, creepy or off-putting | Neutral, fine | Delightful, memorable |
| **Consistency** | The model holds together: one coherent shading/material language, no seams, gaps, intersections, z-fighting or artifacts; reads as the same character in all five views. | Many artifacts; parts clash | A few visible flaws | Clean and unified throughout |
| **Performance cost** | Apply the formula below to the numbers in `stats.json` (not a judgement call). | | | |

**Performance cost formula.** Budget per character: 9,000 triangles and 16 draw calls.
Let `load = max(triangles / 9000, drawCalls / 16)`.
Score: load ≤ 0.5 → 10; ≤ 0.75 → 9; ≤ 1.0 → 8; ≤ 1.5 → 6; ≤ 2.0 → 5; ≤ 3.0 → 4; ≤ 4.0 → 3; > 4.0 → 2.

**Total** = sum of the seven criteria (max 70). Also report the **visual total** = sum of the first six (max 60).

For every candidate list the **three most important defects** (what, which view, why it matters) and one concrete
**fix** for each. Find failures first; do not give credit for things you cannot see.
