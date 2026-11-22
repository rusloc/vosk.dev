# Owner's voice (vosk.dev): rewrite samples and what they teach

The owner's own corrections of drafts written for them. This is the voice spec for anything they publish under their
name (LinkedIn posts and articles, vosk.dev blog posts, outreach). **It beats the general rules in SKILL.md** where the two
disagree. Samples are verbatim, typos included, because they show how the owner writes; the "published" form fixes plain
misspellings only.

New samples are added as they come (CLAUDE.md, "Writing voice"): from `.log/coms/` and from the owner's chat prompts,
dated, verbatim, with one line on what each one teaches.

## Rewrite pairs, 2026-11-17 (the "metric functions for AI agents" post)

| Draft sentence (rejected) | Owner's version (verbatim) | Published as |
|---|---|---|
| That's the kind of hallucination I worry about with data agents. | Data agents can really hallucinate eg. makeup numbers supereasy or tell that smth is unavalable though you can lcearly see it via running simple SQL | Data agents can really hallucinate eg. make up numbers super easy or tell that smth is unavailable though you can clearly see it via running simple SQL. |
| Ask a data chat for last quarter's cost per click across all channels. | Wonna get a quite simple metric out, like quarter CPC across all channels? | Wanna get a quite simple metric out, like quarter CPC across all channels? |
| Four reports on my site have chats built this way: a lender's sales report, a SaaS marketing dashboard, a management P&L and a mining fleet report. Each has an answer key, questions with answers worked out from the data before the chat existed. The last run of each, through the real chat loop: 222 questions, 211 passed the automatic check, about 8 cents of model costs in total. | i build a few "chat with data" demos and all of them passed nearly all test questions (211 out of 222) *(and: "add more details about the price")* | I built a few "chat with data" demos and all of them passed nearly all test questions (211 out of 222). |
| For numbers someone will forward to the board, I want the definition written once and the agent only allowed to call it. | If your are planning to really use the numbers to present to management for real decisions you really gotta be sure what comes out: define the logic once and just force the agent to utilize pre-built retrieval methods so you are 99% sure the metric will be calculated the way it should be | If you are planning to really use the numbers to present to management for real decisions you really gotta be sure what comes out: define the logic once and just force the agent to utilize pre-built retrieval methods so you are 99% sure the metric will be calculated the way it should be. |
| I read all 11 failures. None was an invented number. | The other 11 cases which are kinda fails turned out to be format mismatch or asked metric did not exist and AI offered to adjust the request | (same, spelling unchanged) |
| The agent gets these functions as tools and nothing else. It never sees the schema. Its database login can execute the functions and read its own schema, read-only, with a statement timeout. | Agent does not need to think and know much except for the tools availbale wrapped in ready to use funciton calls: super easy, understandable, manageable, tracebale, with expected results and timing | Agent does not need to think and know much except for the tools available wrapped in ready to use function calls: super easy, understandable, manageable, traceable, with expected results and timing. |

Also that day, on the facts: "211 out of 222 test are fine: this is my reading and it s the truth; do not mention other
numbers".

## Format feedback, 2026-11-17 (the LinkedIn post, in order)

1. "compact the linkeddin post to ~3-5 medium sized paragraphs"
2. "compact the LN post more: 3 paragraph max"
3. "LN post is huge and unhuman: need one punchy paragraph; human style"
4. "long; make it punchy; rewrite completely not just trim the text!!! Three main punches: remove AI hallucinations; tool > SQL DB functions as MCP > perks: speed, predictable behavior, code ownership, access to internals & logic"

The post that was accepted after step 4 (~95 words, one paragraph):

> Want your data agent to stop making up numbers? Don't let it write SQL. Wrap every metric in a SQL function, describe
> it in one line, give the agent those functions as tools. Basically an MCP over your DB. My "chat with data" demos got
> 211 of 222 test questions right this way. And the perks pile up: fast (no reasoning, no query writing, just call and
> answer), predictable (same question, same function, same number), the code is yours (it lives in your DB, not in a
> prompt), and every answer traces back to the exact function and logic behind it.

Then: "re-write the LN article and site blog-post too", meaning the same punches carry the longer pieces.

## Owner's own edits, 2026-11-17 (later the same day)

| Draft (rejected) | Owner's version (verbatim) | What it teaches |
|---|---|---|
| Want your data agent to stop making up numbers? Don't let it write SQL. *(LinkedIn post opening)* | I found out an interesting way to make AI data agent be more precise and cut hallucinations to nearly zero. *(own paragraph)* Don't let it write SQL. *(own paragraph)* | Opens with a personal discovery ("I found out"), then the punch alone on its own line. The question opener was dropped: first person beats a rhetorical question. "nearly zero", not "zero": no overclaim. |
| From raw data extraction to visualization. *(vosk.dev home page)* | From raw data to live data that you can see and chat with. | The outcome the reader gets ("see and chat with"), not the stages of the work ("extraction to visualization"). Plain words. |

## Services page edits, 2026-11-17

| Draft (rejected) | Owner's version (verbatim) | What it teaches |
|---|---|---|
| Report broken, refresh stuck, board meeting on Friday? Send it over — I'll get it sorted this week. | Report broken, refresh stuck, board meeting on Friday? Ping me for super speedy assistance | No promise the owner didn't make ("this week"), no em dash, casual verb ("Ping me"). |
| Education: Learn Power BI, DAX, SQL or data modeling one-on-one — at your own pace, on real problems, no slide decks. | Initial consulting: Want an expert review of you tech stack/code or just need to understand & learn? General BI/AI understandable consulting | A question that names the reader's two situations (review, or learn), then a plain label. "&" and "/" are fine. Published with "your" fixed and "understandable" turned into "in plain words". |
| Semantic layers (Cube) | Semantic layers design | Name the skill, not the vendor tool. |

## Role wording, 2026-11-19

| Draft (rejected) | Owner's version (verbatim) | What it teaches |
|---|---|---|
| Freelance Power BI and Microsoft Fabric consultant; Freelance BI analyst | "i need to be called "Consultant" not a freelancer all over the site; freelancer sounds toxic" | The role is **Consultant**. Never "freelance", "freelancer" or "freelance BI analyst" in anything published under the owner's name. |

## Arrows, 2026-11-20

- Asked to trim "A 2,200-line query went from five minutes to 15 seconds." the owner said: **use ">" instead of
  arrow**. Shipped: "A 2,200-line query: 5 minutes > 15 seconds." Teaches: in the owner's copy a change or a step is
  written with `>`, never `→`.

## What the samples teach

- **The owner is a Consultant, never a freelancer** (11-19): "Power BI and Microsoft Fabric consultant", "BI
  consultant". "Freelance" / "freelancer" reads as cheap to them. Platform names that contain the word (an Upwork URL)
  stay as they are.

- **Open with a casual question or a blunt claim** about the reader's problem ("Wanna get…?", "Want your data agent to
  stop making up numbers?"). Never with a scene-setting statement about the author ("That's the kind of … I worry about").
- **Say what goes wrong, concretely and in plain words**: "make up numbers", "tell that smth is unavailable though you can
  clearly see it". Practical stakes, not abstractions ("worry", "board").
- **Slang is the voice**: eg., smth, kinda, gotta, wanna, tho, super easy, "the way it should be". Keep it. Fix plain
  misspellings only (lcearly, funciton, availbale, "your are", "Wonna").
- **One proof number, no stats dump.** The owner picks the number that matters (211 out of 222) and drops the rest
  (percentages, per-part scores, sample sizes). Don't add numbers they didn't choose. Price detail is welcome when asked.
- **"I built" over "four reports on my site have"**: first person, what they made, not an inventory of it.
- **Failures framed honestly but lightly**: "kinda fails", what they turned out to be, what the AI did about it.
- **Run-on lists of qualities are fine** ("super easy, understandable, manageable, traceable, with expected results and
  timing"). The triad rule doesn't apply to the owner's own lists.
- **End on the business consequence for the reader** (management, real decisions, "99% sure"), never on a principle
  about the author ("I want the definition written once").
- **LinkedIn post = one punchy paragraph, ~100 words**, built on 2–4 "punches" (problem → the tool → proof → perks).
  Long or multi-paragraph posts read as "huge and unhuman". When asked to shorten, **rewrite from the punches, don't
  trim**: trimming a long draft keeps its machine structure.
- **Choppy is wanted.** The checker's staccato / same-length / sentence-uniformity flags are overridden for this owner.
  Em dashes, straw-man "not X but Y", stock openers/closers and emoji are still out.
- The longer pieces (LinkedIn article, site post) carry the **same punches** as the post, in the same order, with the
  detail (SQL, links, the catch) hung on them.
- **`>` for a change or a step, never `→`** (11-20): "5 minutes > 15 seconds".
