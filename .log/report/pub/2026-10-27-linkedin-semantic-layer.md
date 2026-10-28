# LinkedIn post — semantic layer (2026-10-27)

Links to the site post `https://vosk.dev/blog/do-you-need-a-semantic-layer` (site post live first).

---

Ask three people for last month's revenue. You'll get three numbers, and all three will be "right".

That's the problem a semantic layer solves: one agreed definition of every number, read by every tool.

The market has plenty of answers. Power BI semantic models, LookML, the dbt Semantic Layer, Cube, AtScale, and now the warehouses themselves (Snowflake, Databricks). Each one asks you to learn a new language and often run a new service.

If your team already knows SQL, there's a smaller version:
→ one SQL query per business number
→ stored in the database, which Power BI reads on every refresh
→ versioned in git, so every change has an author and a date
→ written and edited by an AI coding agent, reviewed by a human as a plain diff

No new tool to learn. Every definition is a file you can open by hand.

I wrote up who needs a full semantic layer, how the main players differ, and the plain-SQL version I use:
https://vosk.dev/blog/do-you-need-a-semantic-layer

#BusinessIntelligence #PowerBI #SQL #SemanticLayer #DataAnalytics
