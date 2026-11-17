# LinkedIn post + LinkedIn article: metrics as functions for AI agents (2026-11-17)

Chain: LinkedIn post → LinkedIn article → site post `https://vosk.dev/blog/metric-functions-for-ai-agents`
(`content/blog/metric-functions-for-ai-agents.mdx`). The site post must be live before the article goes out; the slug is
a contract from then on.

Facts used, all from the repo:
- `data/ceo-digest/sql/006-chat-functions.sql`: 8 functions; the CPC total-row rule; the Thursday week rule.
- `src/lib/ceo-digest/chat-tools.ts`: the tool descriptions.
- `src/lib/chat/run-chat.ts`: 3 model calls and 4 tool calls per question.
- The eval reports in `.log/report/`, one run per report: marketing 56/58, Mirelo 49/50, P&L 58/63, trucks 48/51.
  That is 211/222 for $0.0776. All 11 failures were read: none is an invented figure.

Owner to-dos (the article's `###` lines are its section headings: set them as headings in LinkedIn's editor):
- Put the LinkedIn article's URL into the post (the `[LINK]` line).
- Pick a cover image for the article. Use none, or a screenshot of the Tidewell chat answering a CPC question.

---

## 1. LinkedIn post (plain text, paste as is)

Ask a data chat for last quarter's cost per click across all channels and watch what it does.

If the agent writes its own SQL, it divides total spend by total clicks. In my demo data only two of five channels have clicks at all, so the number comes out inflated. It still looks like a CPC, the query runs, and the agent explains it with confidence.

That's the hallucination that worries me with data agents, because a made-up customer gets caught quickly and a made-up definition can sit in a monthly report for a year.

So my chats don't write SQL. Every metric is a function, every function has one sentence of description, and that list is all the agent sees. It picks a function, fills in the dates, and writes a sentence around the rows that come back.

I tested it on four report chats: 222 questions with answers worked out in advance. 211 passed the automatic check, for about 8 cents of model time in total. I read the 11 that failed. None had an invented number. They were things like "0.03 pp below plan" against a key that said "−0.03 pp".

The catch: every question needs a function behind it, and the chat says no to anything outside the list. I'm fine with that for numbers that end up in a board pack.

The full write-up has the SQL function, its tool description and the list of failures: [LINK]

#AI #SQL #DataAnalytics

---

## 2. LinkedIn article

Title: Don't let the agent write the SQL

Subtitle (optional): Metrics as functions: an AI data chat that doesn't guess definitions

Ask a data chat for last quarter's cost per click across all channels. If the agent writes its own SQL, it will most likely run sum(spend) / sum(clicks) over the marketing table. In my demo company only paid search and paid social have clicks; the other three channels have spend and no clicks. So the agent's CPC is inflated, and it looks perfectly normal.

That's the kind of hallucination I worry about with data agents. A customer that doesn't exist gets caught quickly. A wrong definition doesn't, because the query runs and the number lands in a believable range.

### What I do instead

Every metric lives in a database function. The function holds the definition, written once, by me: CPC on the total row is paid spend divided by paid clicks; a week belongs to the month its Thursday falls in; no period runs past the last date in the data. Each function gets one sentence of description, for example:

"Marketing for a period, one row per channel plus a total: spend, impressions, clicks, CTR, CPC, MQLs, cost per MQL, trials started and converted, trial-to-paid rate, new customers, CAC, new MRR."

The agent gets these functions as tools and nothing else. It never sees the schema. Its database login can execute the functions and read its own schema, read-only, with a statement timeout.

That changes what the model has to do. It doesn't explore tables or write a query and fix it when it fails. It picks a tool, fills in two dates and writes a sentence around the rows. My chats cap each question at 3 model calls and 4 tool calls, and a small, cheap model is enough.

### The numbers

Four reports on my site have chats built this way: a lender's sales report, a SaaS marketing dashboard, a management P&L and a mining fleet report. Each has an answer key, questions with answers worked out from the data before the chat existed. The last run of each, through the real chat loop: 222 questions, 211 passed the automatic check, about 8 cents of model costs in total.

I read all 11 failures. None was an invented number. Either the figure was right and the grader disagreed with the format (a minus sign, a synonym for the metric's name), or the chat correctly said the figure doesn't exist. One example: asked for a 7-day ad frequency, it answered that the measure needs at least 14 days and offered the nearest valid window.

### It's an MCP server, more or less

Named functions with typed arguments and a description each are what an MCP server exposes as tools. In my demo the same functions have two callers: the chat on the site and an n8n workflow that emails the same data on request. Two front doors, one definition of CAC.

### What it costs

Every answerable question needs a function behind it, and the chat refuses anything outside the list. Writing the metric catalogue is most of the work: the P&L alone has 61 metrics and a 63-question answer key. Descriptions need the same care as code, because they decide when a tool gets called. And function signatures become a contract that other workflows depend on.

Text-to-SQL is fine for exploring a database you know. For numbers someone will forward to the board, I want the definition written once and the agent only allowed to call it.

The full version, with the SQL function, the tool description, the failure list and a live demo chat you can try, is on my site:
https://vosk.dev/blog/metric-functions-for-ai-agents
