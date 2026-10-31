# LinkedIn post — the P&L suite showcase (2026-10-31)

Links to `https://vosk.dev/work/pnl-suite` (live since 12:24). Facts: `src/lib/pnl/engine/control-totals.test.ts`
(552 rows, P / S / GROUP × 8 windows × 23 lines, within 0.01 USD), the pack README (196 tests, 1.39 MB first load,
Power BI flavour T-06 552 / 552). Hashtags kept at three, as on 10-28 (owner's call, against the skill's advice).

---

The dashboard was the last thing I built.

Before a single chart existed there was a CSV with 552 numbers in it: 23 P&L lines, from gross revenue down to net profit, for two companies and the group, over eight time windows. The data generator wrote that file. The job was an engine that lands on every one of those numbers to the cent, and only then draw something.

That's backwards from how most dashboards get made. Usually you connect the tool, drag a measure onto the canvas and look at the chart to decide whether it's right. If it looks plausible, it ships. I've worked that way for years and I think it's where most reporting bugs come from. Almost nobody writes a test for a measure, and I didn't either until this project.

The P&L I just put on my site works the other way round. The browser downloads three compressed files, about 1.4 MB, and a TypeScript engine computes every figure on the page: the statement against budget and prior year, the revenue and profit bridges, the largest variances, margins by region or channel. No BI server and no backend. 196 tests run before any build, and the 552 control totals are the ones that matter.

The same report also exists in Power BI, built against the same 552 numbers. Where the two disagree, one of them is wrong, and that has been the most useful thing about having both.

Limits, because there are some. The data is synthetic. It wants a screen at least 1024 px wide. There's no Excel export, and this version shows the two companies but not the consolidated group yet; that part is being rebuilt.

Open it, change a filter, copy the link. The link carries the whole state, so the P&L you send is the P&L the other person sees.
https://vosk.dev/work/pnl-suite

#PowerBI #FinancialReporting #TypeScript
