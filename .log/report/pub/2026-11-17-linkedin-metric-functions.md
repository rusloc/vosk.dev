# LinkedIn post + LinkedIn article: metrics as functions for AI agents (2026-11-17)

Chain: LinkedIn post → LinkedIn article → site post `https://vosk.dev/blog/metric-functions-for-ai-agents`
(`content/blog/metric-functions-for-ai-agents.mdx`). The site post must be live before the article goes out; the slug is
a contract from then on.

Facts used, all from the repo:
- `data/ceo-digest/sql/006-chat-functions.sql`: 8 functions; the CPC total-row rule; the Thursday week rule.
- `src/lib/ceo-digest/chat-tools.ts`: the tool descriptions.
- `src/lib/chat/run-chat.ts`: 3 model calls and 4 tool calls per question.
- The eval reports in `.log/report/`, one run per report: marketing 56/58, Mirelo 49/50, P&L 58/63, trucks 48/51.
  That is 211/222 for $0.0776 (about 0.035 cents a question, about 2,800 questions per dollar). All 11 failures were
  read: format mismatches, or the asked metric doesn't exist and the chat offered to adjust the request.

Owner's rules for these texts (11-17):
- Voice: the owner's informal, choppy register. Their own sentences stay as they wrote them, spelling fixed.
- Test results: only "211 out of 222" and "the other 11" appear. No per-report scores, no percentages, no answer-key
  sizes, no count of reports with keys.
- Price: about 8 cents for the whole test run, about 2,800 questions per dollar, a small cheap model. The model and the
  vendor are not named.

Owner to-dos (the article's `###` lines are its section headings: set them as headings in LinkedIn's editor):
- Put the LinkedIn article's URL into the post (the `[LINK]` line).
- Pick a cover image for the article. Use none, or a screenshot of the Tidewell chat answering a CPC question.

---

## 1. LinkedIn post (plain text, paste as is)

I found out an interesting way to make AI data agent be more precise and cut hallucinations to nearly zero. 

Don't let it write SQL. 

Wrap every metric in a SQL function, describe it in one line, give the agent those functions as tools. Basically an MCP over your DB. My "chat with data" demos got 211 of 222 test questions right this way. And the perks pile up: fast (no reasoning, no query writing, just call and answer), predictable (same question, same function, same number), the code is yours (it lives in your DB, not in a prompt), and every answer traces back to the exact function and logic behind it.

Full write-up with the SQL function and the tool description: [LINK]

#AI #SQL #DataAnalytics

---

## 2. LinkedIn article

Title: Don't let the agent write the SQL

Subtitle (optional): SQL functions as tools: no made-up numbers, and a few perks on top

Data agents make stuff up. Not always. Just often enough that you can't put the answer in front of management without checking it yourself, which kinda kills the point.

Most of it comes from one habit: the agent writes its own SQL. It looks at the schema, guesses what CPC means, divides all spend by all clicks. In my demo data only 2 channels out of 5 even have clicks. Wrong number. Looks totally fine. The query ran, so nobody asks.

### Take the SQL away

So my agents don't write SQL. At all.

Every metric is a function in the database. The definition lives there, written once, by me: which channels count for CPC, which month a week belongs to, where the data ends. Each function gets one line of description, like "Marketing for a period, one row per channel plus a total: spend, clicks, CPC, CAC, new customers…". That list is everything the agent gets. Pick a function, fill in the dates, write a sentence around the rows. Done.

Basically an MCP over your DB. Named functions, typed arguments, a description each. Any agent can call them, and in my demo an n8n workflow calls the same ones to email the report. One definition of CAC, two front doors.

And it works. I built a few "chat with data" demos this way. 211 out of 222 test questions right. The other 11 were format mismatches, or the metric didn't exist and the chat said so and offered to adjust the ask. No made-up numbers.

### The perks

Speed. Nothing to reason out, no query to write and fix. Each question gets 3 model calls and 4 tool calls max, and the whole test run cost about 8 cents on a small model. That's around 2,800 questions per dollar.

Predictable. Same question, same function, same number. Tomorrow too.

You own the code. The logic sits in your database and your git repo. Not in a prompt, not in a vendor's black box. Change a definition once and every agent, report and workflow that calls it gets the change.

You see the internals. Every answer traces back to the function it called and the arguments it used. Don't trust a number? Open the function and read it.

### The catch

Every question needs a function behind it. Ask something outside the list and the chat says no. Writing the catalogue is the real work, and descriptions need the same care as code.

Worth it though. If you're gonna put the numbers in front of management for real decisions, you gotta be sure what comes out. Define the logic once, force the agent to use it, and you're 99% sure every metric is calculated the way it should be.

The long version, with the SQL function and a live demo chat to try:
https://vosk.dev/blog/metric-functions-for-ai-agents
