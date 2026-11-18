---
name: text-writer
description: Write text that reads as if a specific person wrote it, not a language model. Use this skill whenever the user asks for a tech or IT article, a developer blog post, a dev.to / Habr / Medium piece, a README intro, a release note with a voice, a LinkedIn or X post about software, a GitHub issue or PR comment, a Slack / Telegram / Discord reply, a forum answer, a code-review remark, or any short message they will send under their own name. Also use it when they say "make it sound human", "de-AI this", "humanize", "it reads like ChatGPT", "rewrite in my voice", "no AI slop", or when they paste a draft and ask why it sounds robotic. Works in English and Russian. Do not wait for the word "article"; a request to "answer this guy in the thread" or "write a quick post about our migration" is this skill.
---

# text-writer

Readers now recognise machine prose in a sentence or two, and once they do they stop trusting the content. The tells are well documented: Wikipedia editors, Pangram's corpus statistics, and the humanizer projects agree on a stable set of them. This skill turns that research into a writing procedure. The goal is not to "pass a detector". It is to produce text a competent, slightly opinionated engineer would plausibly have typed.

Two ideas drive everything below:

1. **Slop is a density problem.** One em dash or one "robust" is nothing. The signal is clusters: a triad next to a "not X but Y" next to a bolded label next to "In today's fast-paced world". So the rules target the cluster, and the check script counts density, not single hits.
2. **Structure outlasts vocabulary.** Banned-word lists go stale in months. Uniform sentence length, symmetric paragraphs, section recaps, straw-man contrasts and metaphors that cannot physically coexist are what a trained reader actually notices, and they survive a word-swap pass. Fix rhythm and substance first, words second.

## Workflow

### 1. Identify the format and the language

Pick one, then read its section in `references/formats.md` before drafting:

| Format | Typical length | Register |
|---|---|---|
| **Tech / IT article** | 600-2500 words | explanatory, first person allowed, some headings |
| **Small blog post** | 150-600 words | personal, one idea, almost no structure |
| **Tiny comment / chat reply** | 1-6 sentences | conversational, no formatting at all |

If the text is Russian, also read `references/russian.md`. Russian has its own markers (канцелярит, calques from English, Title Case headings, ГОСТ-perfect typography in a chat) and some English rules invert there.

If the user gave samples of their own writing, treat them as the voice spec: match sentence length distribution, contraction habits, how they open, whether they swear, how they sign off. A voice sample beats every rule in this file.

**Writing for the vosk.dev owner** (their LinkedIn posts and articles, blog posts, outreach): read `references/owner-voice.md` first. It holds their own rewrites of drafts and their format feedback, and it is the voice spec: it beats every rule in this file where they disagree (choppy rhythm, slang, run-on lists, one proof number, one-paragraph LinkedIn posts).

### 2. Get the substance before you write a word

Generic text is the root cause; every stylistic tell grows out of having nothing specific to say. Before drafting, make sure you have at least two of these in hand, and ask the user one short question if you have none:

- a concrete detail only this author would know (the actual error message, the version number, the Tuesday it broke, the colleague's objection)
- a real number, name, date or place ("Postgres 16.2", "p99 went from 340 ms to 90 ms", "the Databricks post from March")
- an opinion someone could reasonably disagree with
- a thing that went wrong, or a limit of the approach

For a tiny reply you usually have all of this in the thread already. For an article, a one-line question ("what was the actual failure mode?") is worth more than any amount of polishing later.

The **horoscope test**: if the paragraph could have been written by anyone, about any similar topic, it is slop. Delete it or add the specific.

### 3. Draft under these constraints

These are the rules that matter most, with the reason each exists. The full catalogue with examples is in `references/anti-patterns.md`; read it when editing someone else's draft or when the check script flags something you do not recognise.

**Substance and stance**
- Say what you think. Hedge only where you are actually unsure, and then say what you are unsure about. Models under-commit (about 60% of the human rate of "must / should / need to"), and the even-handed "it depends" reflex reads as evasion.
- Name things. "A major bank" is slop; "Monzo" is writing. "Research shows" is slop; "the 2024 Juzek & Ward paper" is writing.
- Include the failure, the trade-off, or the thing you would do differently. Nothing marks a human author like admitting the approach has a cost.

**Contrast formulas**
- Never set up a straw man to knock down: "It's not X, it's Y", "not just X but Y", "more than just X", "The question isn't X, it's Y", "Not X. Not Y. Just Z." The test: was X actually claimed by anyone before this sentence? If you invented X one clause earlier, cut the whole move and state Y. This is the most-cited AI tell of 2025-26 and the hardest one for a model to stop doing, so re-check for it in the final pass.
- "From X to Y" only when the range is real and has points between its ends.
- Do not ask a question and answer it in the next clause ("The result? A 40% lift.").

**Rhythm**
- Vary sentence length on purpose. A 4-word sentence next to a 30-word one. Three consecutive sentences of similar length is the single most measurable machine signal; three short declaratives in a row ("Focused. Aligned. Measurable.") is bullets wearing a prose costume.
- Vary paragraph length too. One-line paragraphs are fine. Eight-line paragraphs are fine. Four 3-sentence paragraphs in a row are not.
- Let information density jump: a dense paragraph of numbers, then a light aside, then another hit. Models spread facts evenly; people don't.
- Groups of three are a fingerprint (AI uses them at 4x the human rate). When you list, use two, four, or however many there actually are. Watch for triads of adjectives especially ("fast, reliable, and scalable").

**Words**
- Plain verbs. "is", "has", "uses", "breaks". Not "serves as", "stands as", "boasts", "showcases", "leverages", "harnesses", "facilitates".
- No decorative adjectives. If removing the word only makes the sentence shorter, keep it removed. If it loses precise meaning, put it back.
- Avoid the Tier-1 list in `references/anti-patterns.md` (delve, tapestry, testament, pivotal, crucial, seamless, robust, landscape, navigate, elevate, comprehensive, nuanced, multifaceted, game-changer, unlock...). One of these in 1000 words is fine if it is the exact word. A cluster is not.
- Repeat the noun. "The cache... the cache... the cache." Synonym cycling ("the cache... the caching layer... the in-memory store") is a model habit; people repeat.
- Contractions, where the register allows. "don't", "it's", "we've".
- No stock openers or closers: "In today's fast-paced world", "In the ever-evolving landscape of", "It's important to note that", "In conclusion", "At the end of the day", "Moving forward".

**Metaphors**
- Check every metaphor for physical coherence. Pillars cannot be "overarching". Nothing is "nestled" in a war. You fill a container; you write on a slate; you cannot fill a slate. Models pick words by proximity, not by whether the picture works, and this is the tell an expert reader trusts most. One clean metaphor per piece is plenty; mixed ones are worse than none.
- Inanimate subjects should not act like people: "the study emphasises", "the data suggests we should", "this approach empowers". Say who did what.

**Punctuation and symbols**
- No em dashes (—). Use a comma, a colon, a full stop, or parentheses. Models use the em dash at 7-10x the human rate and readers now flinch at it. If a sentence needs the dash to work, it needs restructuring.
- Straight quotes in anything typed into a chat, forum or email. Curly quotes are a paste signature.
- No emoji unless the user's own samples use them, and never ✅ ✔️ 🚀 ❌ 💡 or keycap numbers (these run 60-170x the human rate). Faces are what people actually use.
- No decorative Unicode: → ≈ ─ ⚠ • ▪.

**Formatting**
- In a comment, chat reply, email or forum post: **no markdown at all**. Visible `**asterisks**` or `#` in plain text is a 40x tell and the single most reliable one. Write sentences.
- In a blog post: no headings, no bullets, maybe one italic word.
- In an article: headings only where the reader needs to jump; bullets only for items that are actually a list (steps, options), never for prose chopped into fragments; bold almost never; no "**Label:** explanation" bullet lists; no "Key Takeaways" or "Conclusion" blocks the reader did not ask for.

**Structure**
- No intro that restates the title. Start with the thing itself: the error, the number, the claim.
- No section-ending recaps ("Overall, this shows..."). No "Firstly / Secondly / Thirdly". No preview of what the article will cover.
- No chatbot connective tissue: "Let's dive in", "Now that we've covered X, let's look at Y", "This is where X comes in", "Рассмотрим подробнее".
- End when you are done. No "I hope this helps", no "Let me know if...", no CTA, no "Thoughts?".

### 4. Run the check

```bash
python3 scripts/slop_check.py draft.md
# or for a reply you have not saved:
echo "the reply text" | python3 scripts/slop_check.py -
```

It reports em-dash density, markdown in plain text, bullet ratio, triads, contrast formulas, Tier-1 word clusters, sentence-length spread, runs of same-length sentences, stock phrases, UI emoji, and the Russian markers. Flags are not verdicts; a flagged word that is the exact right word stays. But a draft with three or more distinct flags has a cluster, and that is what readers smell. Fix and re-run.

The script exits non-zero on any critical flag (markdown in a reply, em dash in a reply, a cheerful-assistant opener, a cutoff disclaimer), so you can use it in a loop.

### 5. Final read

Read the draft aloud in your head, as the author. At every sentence ask: would this person say this, in this channel, to these readers? Strike anything that sounds like a presentation. Then re-check specifically for "not X but Y" (it creeps back in during edits) and for any sentence whose only job is to introduce the next one.

## Output

Return the text and nothing else. No preamble ("Here's a draft..."), no explanation of what you did, no offer to adjust. If the user asked for a file, write it; otherwise put the text in the reply, in plain text for replies and posts, in light markdown only for articles that will be rendered.

If you had to make an assumption about voice or facts (for example, you invented a placeholder number), say so in one line *after* the text, clearly separated, so the user can fill it in. Never invent a specific fact and present it as real.

## When the user gives you their own draft to fix

Edit, don't rewrite. Mark paragraphs mentally as red (3+ markers: rewrite), yellow (1-2: spot fix), green (clean: leave it alone, even if you would have phrased it differently). Untouched human sentences are the most valuable thing in the document. Keep the author's opinions, jokes and odd word choices; strip only the machine residue. Return the edited text, then a two-line note of what categories you changed.

## References

- `references/owner-voice.md`: the vosk.dev owner's rewrite samples and format feedback, verbatim, with what they teach. Read first for anything published under the owner's name; it grows as new samples come in.
- `references/anti-patterns.md`: the full catalogue (vocabulary tiers, stock phrases, contrast forms, structure, punctuation, formatting, meta leaks) with examples and before/after pairs. Read when editing a draft or when unsure whether something is a tell.
- `references/formats.md`: what good looks like for each of the three formats, with examples. Read the relevant section every time.
- `references/russian.md`: Russian-specific markers and the rules that invert. Read for any Russian text.
- `scripts/slop_check.py`: the density checker. Run on every draft longer than a sentence.
