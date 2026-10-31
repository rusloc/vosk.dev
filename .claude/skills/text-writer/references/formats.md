# Formats

What each of the three formats looks like when a person writes it. Read the section you need before drafting.

## Tech / IT article (600-2500 words)

Where it lives: a company engineering blog, dev.to, Habr, Medium, a personal site. Readers are engineers who skim first and read if the first paragraph earns it.

**Shape**
- Open on the concrete thing: the incident, the number, the claim, the question you had. Never on a definition, never on "In today's...", never on what the article will cover.
- Headings only where a skimming reader needs to jump (usually 2-5 in a 1500-word piece). Sentence case. Plain nouns ("Why the pool ran dry", "What we changed"), not two-part dramatic titles.
- Paragraphs of wildly different length. A one-liner after a long one. A long one with four clauses and a parenthesis after that.
- Bullets only for things that are a list: steps, config options, a set of commands. If each bullet is a sentence of prose, it's a paragraph that got chopped.
- Code blocks are fine and expected; they also break rhythm in a way that reads human.
- Bold: almost never. Maybe one warning. Never on a label at the start of a bullet.
- End on the last useful thing you have to say. Not a summary, not "I hope this helps", not a CTA. A trade-off or an open question is a good last line.

**Voice**
- First person is normal ("I", "we"). Say what you did and what you'd do differently.
- Opinions: at least one a reader could disagree with.
- Specifics: version numbers, latency figures, the actual error text, the date, the colleague's name if it's public.
- One limitation or failure stated plainly. "This broke the first time because..."
- Contractions. Short sentences next to long ones.

**What to cut on review**: every sentence that previews or recaps; every "it's worth noting"; every triad of adjectives; every em dash; every "not X but Y"; every bolded label.

**Example opening (good)**

> Our Postgres box hit max_connections at 23:40 on a Tuesday, during a deploy, with 140 idle connections sitting in the pool and 60 more waiting. The fix took an afternoon. Understanding why it happened took two weeks, and most of that was me being wrong about how pgbouncer's transaction mode works.

**Example opening (bad)**

> In today's fast-paced world of software development, database connection management plays a crucial role in ensuring application performance. In this article, we'll delve into connection pooling and explore how it can help you build more robust, scalable systems.

## Small blog post (150-600 words)

Where it lives: a personal blog, a Substack note, an internal engineering newsletter, a long LinkedIn post. One idea, told like you'd tell a colleague at lunch.

**Shape**
- A title line if the site needs one, then no headings. No bullets. Maybe one italic word.
- Three to eight paragraphs of uneven length. Often the first is a single sentence.
- Starts in the middle of the thought. "I finally deleted the Redis cache yesterday." Not "Caching is an important topic."
- Ends where the thought ends. A half-conclusion is fine. A question you don't answer is fine.

**Voice**
- More personal than the article. What you felt, what annoyed you, what you were wrong about.
- One concrete scene or detail: the time, the place, the thing on the screen.
- Position taken. "I think X is a mistake" with one reason, not a balanced survey.
- No LinkedIn closers: no "Agree?", no "Thoughts?", no hashtags, no "Thrilled to share".

**Example (good, ~120 words)**

> I finally deleted the Redis cache yesterday. It had been in front of our product catalogue since 2021 and nobody could tell me what it was for. Hit rate 11%. The Postgres queries behind it take 4 ms.
>
> I'd been scared of this for a year. Removing infrastructure feels riskier than adding it, because if something breaks everyone knows whose commit did it.
>
> Nothing broke. p99 went up by 2 ms. We deleted 600 lines of invalidation logic that had two open bugs against it.
>
> The lesson I keep relearning: most caching is a bet that the database is slow, and nobody goes back to check whether it still is.

**Example (bad)**

> Caching is a powerful tool in any developer's toolkit. However, it's important to note that caching isn't just about speed, it's about making the right architectural choices. In this post, I'll share three key lessons I learned from removing a cache layer. 🚀

## Tiny comment / chat reply (1-6 sentences)

Where it lives: a GitHub issue or PR review, Slack, Telegram, Discord, a Stack Overflow comment, a Hacker News or Reddit reply, a Jira comment, a two-line email.

**Shape**
- Plain text. No markdown at all: no bold, no headings, no bullets. The only exception is a code span or a code block when you are quoting code, because that's what people do in GitHub and Slack.
- Usually one paragraph. Two if there is a genuinely separate point.
- Answer first, context after. "Transaction mode. Session mode will leak prepared statements." Not "Great question! There are a few things to consider here."
- No greeting unless the channel expects one. No sign-off. No "Hope this helps!", no "Let me know if...".
- It can be blunt. It can be incomplete. It can end with a question back.

**Voice**
- Sounds like someone typing fast who knows the answer.
- References the thread: the other person's words, the file name, the line number, the previous attempt.
- Contractions always. Lowercase first letter is fine if the channel is casual.
- One emoji at most, and only a face, and only if the channel uses them.

**Example replies (good)**

GitHub PR comment:
> This will deadlock if `refresh()` is called from inside the lock on line 42. We hit exactly this last month in the scheduler. Either make `refresh` non-blocking or take the lock out of `tick()`.

Slack:
> yeah that's the pgbouncer thing again. set pool_mode=transaction on the worker side and the idle count should drop. if it doesn't, it's the cron jobs holding sessions open and I can look tomorrow.

Issue reply:
> Can't reproduce on 2.4.1. What does `docker compose logs api | grep -i pool` show right after it hangs? If it's the "exhausted" line we've seen that with the default 10-connection limit.

**Example replies (bad)**

> Great question! There are **several approaches** you could consider here:
> 1. **Transaction pooling** — this is generally the recommended approach...
> 2. **Session pooling** — ...
> Let me know if you'd like me to elaborate on any of these! 🚀

> Thanks for raising this. It's important to note that connection pooling isn't just about performance, it's about resilience. I'd be happy to help you delve into the options.

## Editing someone else's draft (any format)

Red / yellow / green by paragraph. Three or more markers: rewrite the paragraph in the author's voice. One or two: fix those spots only. Zero: leave it, even if you'd have said it differently. The untouched sentences are what makes the whole piece read human.

Keep the author's jokes, opinions, odd word choices, and any sentence that could only have been written by them. Return the text, then two lines on what categories you removed.
