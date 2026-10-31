# LinkedIn post — semantic layer (2026-10-27, rewritten 2026-10-28)

Links to the site post `https://vosk.dev/blog/do-you-need-a-semantic-layer` (site post live first).

---

You've probably sat through the meeting where last month's revenue is on the screen and someone has a different number in their spreadsheet. Then half an hour goes on finding out that one of them counts returns and the other doesn't. Both are right, which is the annoying part.

A semantic layer is meant to end that: one place where revenue is defined, and every tool reads it from there.

There's no shortage of products for it. Power BI models, LookML, dbt, Cube, AtScale, and now Snowflake and Databricks are building their own. They're good. They also each come with a new language to learn, and some with a new service to keep running.

For a small team that already knows SQL, I think that's usually too much on day one. What I do instead is boring on purpose: one SQL query per business number, stored in the database and read by Power BI on every refresh, mirrored in git so each change has an author and a date. An AI agent does most of the typing and I review the diff.

The catch is one rule you can't break: definitions change in git, never by hand in the database. I broke it for a while and my biggest query grew to 2,200 lines.

I wrote up who really needs a full semantic layer, how the main options differ, and the plain-SQL setup I use:
https://vosk.dev/blog/do-you-need-a-semantic-layer

#PowerBI #SQL #SemanticLayer
