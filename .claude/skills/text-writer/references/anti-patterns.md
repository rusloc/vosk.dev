# Anti-patterns catalogue

Condensed from the master research list (Wikipedia "Signs of AI writing", Pangram corpus data, Juzek & Ward, The Atlantic, humanizer / humanizer-ru, Bouchard's 6,750-draft study, Bullock). Numbers are AI:human frequency ratios where a source measured them.

Contents
1. Contrast formulas
2. Vocabulary tiers
3. Stock phrases
4. Structure and rhythm
5. Punctuation and symbols
6. Formatting
7. Substance failures
8. Tone
9. Meta leaks
10. Before / after pairs

---

## 1. Contrast formulas (the straw-man family)

The mechanism: invent a claim nobody made, deny it, assert the real point. It simulates insight. Measured at 3x the human rate for "not just X but Y"; present in 52% of the weakest drafts vs 18% of the strongest; found in 80%+ of Russian GPT output.

Every surface form counts:
- It's not X, it's Y. / It isn't X. It's Y.
- It's not just X, it's Y. / not only X but also Y / more than just X
- Not X. Not Y. Just Z. (the countdown)
- The question isn't X. The question is Y. / The real issue isn't X, it's Y.
- X? No. Y. / Forget X. Focus on Y. / Stop thinking X. Start thinking Y.
- X is dead. Y is the future. / Less X, more Y. / You don't need X. You need Y.
- not because X, but because Y
- This doesn't mean X. It means Y. (split-sentence variant)
- X rather than Y (when X was never on the table)
- Trailing copula: "It's a tool, not a toy."

Keep it only when X was stated earlier by a real person and you are answering them. Otherwise state Y.

Related: "From X to Y" false ranges ("from startups to Fortune 500", "от анализа документов до построения сложных моделей"). A real range has identifiable points between its ends.

Related: rhetorical question with instant answer ("The result? A 40% lift." "Why? Because..."). 51% of weakest drafts vs 34% of strongest.

Related: manufactured-importance terminators: "Full stop." "Make no mistake." "Read that again." "Let that sink in." "And that matters."

Related: throat-clearing: "Here's the thing:", "Look,", "Let's be honest:", "Here's the deal."

Related: analogy scaffolding: "Imagine...", "Think of it like this:", "It's like X for Y."

## 2. Vocabulary tiers

**Tier 1** (high AI:human ratio; a cluster of two or more in a paragraph is a tell):
delve, tapestry, intricate, underscore, meticulous, commendable, multifaceted, leverage, pivotal, realm, embark, vibrant, testament, landscape (metaphorical), navigate (metaphorical), elevate, seamless, robust, holistic, foster, garner, showcase, enhance, unlock, unleash, transformative, game-changer, crucial, comprehensive, nuanced, paramount, groundbreaking, cutting-edge, ever-evolving, synergy, streamline, cornerstone, treasure trove, plethora, myriad, empower, harness, thrive, invaluable.

"Crucial / critical" alone: 38% of weakest drafts vs 3% of strongest.

**Tier 2** (fine alone, suspicious in clusters): moreover, furthermore, additionally, notably, arguably, subsequently, ultimately, essentially, significantly, dynamic, orchestrate, intertwine, tirelessly, revolutionize, kaleidoscopic, interconnectedness, honestly, actually, quietly, "that matters", toolkit, "the move".

**Model pets**: Claude: toolkit, "the move here", "that matters", quietly. Gemini: buckets, gaps, undergird, overarching, nestled, amid. ChatGPT: delve, tapestry, testament, "Certainly!".

**Copula avoidance** (dressed-up "is"): serves as, stands as, acts as, functions as, represents, boasts, features, showcases, "is home to".
"The update serves as a testament to the company's commitment to innovation" → "The update adds batch processing."

**Nominalisation chains**: "the implementation of the system was carried out" → "we implemented the system"; "obtaining of results" → "got results".

## 3. Stock phrases

Openers (35x for the first): In today's fast-paced world; In the ever-evolving landscape of; In the digital age; In an era of; As we navigate the complexities of; Have you ever wondered; "In a world where..."

Importance inflation: stands as a testament to; serves as a reminder; plays a vital / crucial / key role; marks a turning point; a significant leap; rich cultural heritage; hidden gem; must-visit; breathtaking; nestled in the heart of; enduring legacy; "a cultural landmark".

Note-phrases (22x): It's important / crucial to note that; It's worth noting; It's important to remember.

Motion verbs: delve into (45x); dive into; embark on a journey; navigate the tapestry of (18x); unlock the power / potential of; "let's dive in".

Closers: In conclusion; At the end of the day; Moving forward; The best part is; "the real magic happens"; Key takeaways; Final thoughts.

Pseudo-insight: The key is to find balance; Self-care isn't selfish; chaos into clarity; "the hard truth is".

Review-speak (Pangram n-grams): recently had the pleasure; highly recommend for anyone; is a compelling read; its compact design; noticeable lag.

Fiction-speak: took a slow sip; weight of unspoken; steady despite the tremor; profound connection between.

## 4. Structure and rhythm

- **Rule of three** (4x): three adjectives, three benefits, three examples; alliterative triads ("clear, concise, and compelling"); nested triads.
- **Parataxis / staccato**: 3+ consecutive sentences under 10 words, parallel, declarative. "Focused. Aligned. Measurable."
- **Sentence-length uniformity**: every sentence 10-15 words; standard deviation under ~5 words. Three consecutive same-length sentences.
- **Paragraph symmetry**: every paragraph 3-4 sentences of similar word count.
- **Uniform information density**: facts spread evenly; no light connectors, no dense bursts.
- **Default essay skeleton**: intro restating the title; Firstly / Secondly / Thirdly; "Challenges" section; "Future prospects"; "In conclusion" that is the intro again.
- **Section-ending recaps**: "Overall, ...", "In summary, ...", "This highlights the importance of...".
- **Parallel sections**: every section same length, same shape, same closing move.
- **Synonym cycling**: the company / the organisation / the enterprise / the firm.
- **Preview-point-recap**: says what it will say, says it, says what it said.
- **Chatbot navigation**: "Let's dive in", "Now that we've explored X, let's move on to Y", "This is where X comes in", "Рассмотрим подробнее", "Давайте разберёмся".
- **Dramatic two-part headings**: "The Hidden Cost: Why Your Stack Is Slowing You Down"; Title Case headings.
- **Hedging stacks**: "may potentially help in some cases depending on..."; "It's important to note that results vary."
- **Under-commitment**: humans use "must / should / need to" at 23.6 per 10k words, AI at 14.1.

## 5. Punctuation and symbols

- **Em dash (—)**: 10x overall (17 vs 2 per 10k); OpenAI 45, open-source 37, Anthropic 32, Gemini 3 Pro 3. More than three per page appeared in 56% of weakest drafts and 0.1% of strongest. Replace with comma (aside), parentheses (tangent), colon (definition), full stop (separate thought). Caveat: deleting dashes without fixing the short-pivot-elaborate rhythm underneath just hides the tell.
- **Parentheticals**: one per paragraph is a habit, not a style.
- **Curly quotes / apostrophes** in chat, forum, email, code comments: paste signature.
- **Unusual Unicode** (3x): ─ (940x), ≈ (241x), ⚠ (57x), → (48x), ≥ ≤ ×, •, ▪, ◦, ✓. Zero-width characters and homoglyphs usually mean a humanizer tool was used.
- **Emoji**: aggregate rate is barely elevated; the tell is *which*. ✅ 167x, 2️⃣ 129x, 4️⃣ 98x, 3️⃣ 86x, ✔️ 64x, 1️⃣ 61x, 🚀 26x, ❌ 24x; also 💡 🔥 ⚡ 🎯. Humans use faces (😊 ❤️) far more. Emoji as bullets, emoji in headings, "🧵 Thread:" openers.
- **Ellipses** as transitions rather than trailing off.
- **Semicolons**: AI underuses them; a well-placed semicolon reads human.

## 6. Formatting

- **Markdown in plain text** (12x; bold 43x, # headings 23x): visible `**text**` or `#` in an email, DM, forum post, SMS or chat.
- **Bold on ordinary phrases** several times per paragraph.
- **Bolded-label bullets**: "- **Scalability:** The system scales easily." Near-universal in AI output, almost absent in human writing.
- **Over-bulleting** (9x; 28 vs 3 per 10k): prose chopped into fragments; more than ~60% of body as bullets.
- **Heading for every paragraph**; "Key Takeaways", "Conclusion", "Final Thoughts" added unprompted.
- **Tables for non-tabular content**: a 3-row table that should be a sentence.
- **Hashtag stacks and CTA endings**: "Thoughts?", "Agree?", "Drop a comment", "#AI #Innovation", "Thrilled to announce".

## 7. Substance failures

- **Inflated importance**: everything pivotal, vital, a cornerstone, a turning point.
- **Promotional tone**: vibrant, state-of-the-art, world-class, renowned; press-outlet name-dropping (Wired, Forbes, BBC) to look notable.
- **Wikipedia rehash**: "X is defined as..."; the first paragraph of the encyclopaedia entry, rephrased.
- **Phantom experts**: "Studies show", "Experts agree", "some critics argue", "many believe".
- **Fabricated citations**: plausible references that do not exist, broken DOIs, wrong authors on real titles.
- **Editorialising**: "This remarkable achievement", "unfortunately", "it is clear that".
- **Placeholder specificity**: "Most teams", "In many cases", "a major bank". Fix with a name, a number, a date.
- **Water**: can be cut in half with no loss.
- **Even-handed to a fault**: every claim balanced, no position, "it depends" as a reflex.
- **Cutoff-shaped facts**: "as of 2023" in a 2026 text.

## 8. Tone

- **Sycophancy**: "Great question!", "You're absolutely right", "Great point", "you're touching on".
- **Cheerful-assistant openers** (zero human occurrences): "Certainly! Here's", "Sure! Here's a", "I'd be happy to", "Here's what you need to know".
- **Energy without cause**: exclamation marks about routine topics; "Buckle up!"; "Here's the kicker".
- **No modulation**: same register for a eulogy and a launch post.
- **Too safe**: the most socially acceptable average; no edges, no irritation.
- **Letter sign-offs in non-letters**: "I hope this helps!", "Let me know if you'd like me to...", "Feel free to reach out".
- **Credential announcing**: "As a senior engineer, I..."

## 9. Meta leaks (any one fails the piece)

- "As of my last update", "As an AI language model", "I don't have access to real-time data"
- "[Your Name]", "[insert date]", "[Company]"
- "You may want to add a citation here", "Adjust tone as needed"
- Stray ``` or # in rendered prose
- "Here is the revised paragraph with a more formal tone:"
- Mid-word truncation at a token limit
- A term given in one language then needlessly repeated in another

## 10. Before / after pairs

**Opener**
Before: In today's fast-paced world of software development, it's crucial to understand the importance of connection pooling.
After: We ran out of Postgres connections at 11pm on a Tuesday. Here is what I learned.

**Contrast**
Before: PgBouncer isn't just a proxy, it's a fundamental shift in how you think about database access.
After: PgBouncer is a proxy that holds connections open so your app doesn't have to.

**Triad + bold label**
Before:
- **Performance:** Faster, leaner, and more scalable.
- **Reliability:** Robust, resilient, and battle-tested.
After: It's faster (p99 went from 340 ms to 90 ms) and it has not crashed in the four months we've run it.

**Copula avoidance**
Before: The migration serves as a testament to the team's commitment to reliability.
After: The migration took three weeks and nothing broke.

**Uniform rhythm**
Before: AI raises productivity 40%. It also cuts errors 25%. Furthermore it speeds time-to-market 30%.
After: Productivity went up about 40% and errors dropped by a quarter, at least on paper. In practice half the team doesn't trust the model and re-checks everything by hand. The half that does ships about 30% faster.

**Section recap**
Before: Overall, these considerations highlight the importance of choosing the right pooling strategy for your use case.
After: (delete the sentence)

**Chat reply**
Before: Great question! There are **three main approaches** you could consider:
1. **Option A** — ...
After: Depends what's eating the connections. If it's the workers, cap the pool at 5 per worker and see if the errors stop. If it's the web tier, PgBouncer in transaction mode.

**Hedging**
Before: It may potentially be worth considering whether, in some cases, a different approach might be more suitable depending on your specific requirements.
After: Use transaction mode unless you need prepared statements. Then use session mode and accept the lower connection count.

**Russian**
Before: Было осуществлено внедрение системы мониторинга, что позволяет обеспечить повышение эффективности работы.
After: Мы поставили мониторинг. Теперь видим, где тормозит.
