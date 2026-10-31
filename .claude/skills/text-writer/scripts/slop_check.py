#!/usr/bin/env python3
"""slop_check.py: density check for AI-text tells in English and Russian prose.

Usage:
    python3 slop_check.py draft.md
    echo "text" | python3 slop_check.py -
    python3 slop_check.py draft.md --format reply   # article | post | reply (default: auto)
    python3 slop_check.py draft.md --json

Exit code 1 when any CRITICAL flag fires, else 0. Flags are evidence, not verdicts:
a flagged word that is the exact right word stays. Three or more distinct flag
categories in one draft is the cluster readers notice.
"""
import argparse
import json
import re
import statistics
import sys

TIER1 = [
    "delve", "tapestry", "intricate", "underscore", "meticulous", "commendable",
    "multifaceted", "leverage", "pivotal", "realm", "embark", "vibrant", "testament",
    "landscape", "navigate", "elevate", "seamless", "robust", "holistic", "foster",
    "garner", "showcase", "unlock", "unleash", "transformative", "game-changer",
    "game changer", "crucial", "comprehensive", "nuanced", "paramount", "groundbreaking",
    "cutting-edge", "ever-evolving", "synergy", "streamline", "cornerstone",
    "treasure trove", "plethora", "myriad", "empower", "harness", "invaluable",
]

STOCK_PHRASES = [
    r"in today'?s (fast-paced|digital|modern|ever-changing) (world|age|era|landscape)",
    r"in the (ever-evolving|rapidly (evolving|changing)) (landscape|world)",
    r"in (an|the) era of", r"as we navigate", r"have you ever wondered",
    r"it'?s (important|crucial|worth|essential) to (note|remember|understand|mention)",
    r"(stands|serves) as a (testament|reminder)", r"plays? a (vital|crucial|key|pivotal) role",
    r"marks a turning point", r"a significant leap", r"hidden gem", r"must-visit",
    r"nestled in", r"enduring legacy", r"delve into", r"dive into", r"let'?s dive in",
    r"embark on", r"unlock the (power|potential|full)", r"in conclusion",
    r"at the end of the day", r"moving forward", r"the best part is", r"real magic",
    r"key takeaways?", r"final thoughts", r"the key is to find balance",
    r"here'?s the (thing|deal|kicker)", r"let'?s be honest", r"make no mistake",
    r"let that sink in", r"read that again", r"full stop\.", r"think of it (like|as)",
    r"imagine (a|if|this)", r"this is where \w+ comes in", r"now that we'?ve (covered|explored|seen)",
    r"firstly", r"secondly", r"thirdly", r"a game[- ]changer",
    r"studies (show|have shown|suggest)", r"experts (agree|say|note)", r"research shows",
    r"it is clear that", r"as a (senior|seasoned|experienced) \w+, i",
]

CHATBOT_OPENERS = [
    r"^\s*(certainly|sure|absolutely|of course)[!,.]", r"i'?d be happy to", r"great question",
    r"that'?s a (really )?great (question|point)", r"you'?re absolutely right",
    r"here'?s what you need to know", r"i hope this helps", r"let me know if (you|there)",
    r"feel free to (reach out|ask)", r"as an ai", r"as of my last (update|training)",
    r"i don'?t have access to real-time", r"\[(your name|insert|company|date)\]",
    r"(отличный|спасибо за) вопрос", r"надеюсь,? это поможет", r"буду рад помочь",
    r"как (языковая модель|ии-модель)", r"конечно[!,] вот",
]

SEP = r"[,;:.—–-]? ?"
CONTRAST = [
    r"\bnot (just|only|merely|simply) [^.,;:—–]{1,60}" + SEP + r"(but|it'?s|it is|but also)\b",
    r"\bit'?s not (a |an |the )?[^.,;—–]{1,50}" + SEP + r"it'?s\b",
    r"\bisn'?t (just |only )?[^.,;—–]{1,50}" + SEP + r"(it'?s|it is|but)\b",
    r"\bmore than just\b",
    r"\bthe (question|issue|problem|point|answer) (isn'?t|is not) [^.]{1,60}\. ?(the|it'?s)\b",
    r"\bnot because [^,]{1,60}, but because\b",
    r"\b(this|that) (doesn'?t|does not) mean [^.]{1,60}\. ?it means\b",
    r"\bforget [^.]{1,40}\. ?(focus|think|start)\b",
    r"\b\w+ is dead\. \w+ is the future\b",
]

RU_CRITICAL = [
    r"не просто [^,]{1,40}, а ", r"не только [^,]{1,50}, но и ", r"больше,? чем просто",
    r"в современном (мире|динамично)", r"в эпоху цифров", r"играет (ключевую|важную|всё более важную) роль",
    r"комплексн(ый|ого|ому) подход", r"подчёркивает важность", r"подчеркивает важность",
    r"нюансированн", r"бесшовн", r"холистическ", r"робастн",
    r"(исследование|анализ|статья|данные|отчёт|отчет) (подчёркивает|подчеркивает|показывает|отмечает|свидетельствует|демонстрирует)",
    r"исследования показывают", r"эксперты (отмечают|считают|говорят)",
    r"рассмотрим подробнее", r"давайте? разбер[её]мся", r"начн[её]м с основ", r"подводя итог",
    r"было осуществлено", r"осуществлени[ея] ", r"в рамках реализации", r"с целью (обеспечения|повышения)",
    r"вопрос не в том,", r"по своей сути", r"в своей основе", r"в конечном сч[её]те",
    r"гобелен", r"вплетен", r"ландшафт (возможностей|решений|технологий)",
]

UI_EMOJI = ["✅", "✔️", "✔", "❌", "🚀", "💡", "🔥", "⚡", "🎯", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "🧵", "👉", "📌", "⚠️"]
ODD_UNICODE = ["─", "≈", "⚠", "→", "←", "≥", "≤", "•", "▪", "◦", "✓", "═", "║"]


def split_sentences(text):
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"`[^`]*`", "X", text)
    text = re.sub(r"^#+ .*$", "", text, flags=re.M)
    text = re.sub(r"^\s*[-*•]\s+", "", text, flags=re.M)
    parts = re.split(r"(?<=[.!?…])\s+|\n\s*\n", text)
    return [p.strip() for p in parts if len(p.strip().split()) >= 2]


def word_count(s):
    return len(re.findall(r"[\w'’-]+", s))


def guess_format(text, words):
    if words < 120:
        return "reply"
    if words < 700 and not re.search(r"^#+ ", text, re.M):
        return "post"
    return "article"


def check(text, fmt=None):
    flags = []
    words = word_count(text) or 1
    # per-1000 density; on short texts use the raw count so one word does not read as 13/1000
    per_k = lambda n: round(n * 1000 / words, 1) if words >= 300 else float(n)
    fmt = fmt or guess_format(text, words)
    cyr = len(re.findall(r"[а-яА-ЯёЁ]", text)) / max(len(text), 1) > 0.3
    low = text.lower()

    def add(level, cat, msg, examples=None):
        flags.append({"level": level, "category": cat, "msg": msg, "examples": (examples or [])[:4]})

    # --- critical: meta leaks and chatbot register
    hits = [m.group(0) for p in CHATBOT_OPENERS for m in re.finditer(p, low, re.M | re.I)]
    if hits:
        add("CRITICAL", "chatbot-register", "assistant opener / sign-off / cutoff disclaimer / placeholder", hits)

    # --- em dash
    em = len(re.findall(r"[—–]", text))
    if em:
        if fmt == "reply":
            add("CRITICAL", "em-dash", f"{em} dash(es) in a chat/comment reply; people type commas or hyphens here")
        elif per_k(em) >= 3 and not cyr:
            add("HIGH", "em-dash", f"{em} em dashes = {per_k(em)}/1000 words (human 0-2)")
        elif per_k(em) >= 6:
            add("HIGH", "em-dash", f"{em} dashes = {per_k(em)}/1000 words; even for Russian this is dense")
        elif em and not cyr:
            add("LOW", "em-dash", f"{em} em dash(es); fine if you meant them, but the skill prefers zero")

    # --- markdown in plain-text formats
    bold = len(re.findall(r"\*\*[^*\n]+\*\*", text))
    # a single leading "# Title" line is a title, not structure; don't count it
    body_for_heads = re.sub(r"\A\s*# [^\n]+\n", "", text)
    heads = len(re.findall(r"^#{1,6} ", body_for_heads, re.M))
    bullets = len(re.findall(r"^\s*([-*•]|\d+[.)])\s+", text, re.M))
    if fmt == "reply" and (bold or heads or bullets):
        add("CRITICAL", "markdown-in-plain-text", f"bold={bold} headings={heads} bullets={bullets} in a reply; this is the 40x tell")
    elif fmt == "post" and (bold or heads or bullets > 1):
        add("HIGH", "markdown-in-post", f"bold={bold} headings={heads} bullets={bullets}; a blog post is prose")
    else:
        if bold >= 3:
            add("HIGH", "bold", f"{bold} bold spans; bold on ordinary phrases is a tell")
        label_bullets = re.findall(r"^\s*[-*]\s+\*\*[^*]+:?\*\*", text, re.M)
        if label_bullets:
            add("HIGH", "bolded-label-bullets", f"{len(label_bullets)} '**Label:** text' bullets; near-absent in human writing", label_bullets)
        sents = split_sentences(text)
        if bullets and sents and bullets / (bullets + len(sents)) > 0.4:
            add("HIGH", "bullet-ratio", f"{bullets} bullets vs {len(sents)} prose sentences; over 40% bullets")
        if heads and words / max(heads, 1) < 120:
            add("MEDIUM", "heading-density", f"{heads} headings in {words} words; a heading every paragraph")

    # --- contrast formulas
    hits = [m.group(0) for p in CONTRAST for m in re.finditer(p, low, re.I)]
    if hits:
        add("HIGH", "not-x-but-y", f"{len(hits)} straw-man contrast(s); the most-cited AI tell", hits)
    rng = re.findall(r"\bfrom [\w\s-]{2,25} to [\w\s-]{2,25}\b", low)
    if len(rng) >= 2:
        add("LOW", "from-x-to-y", f"{len(rng)} 'from X to Y' ranges; check each is a real spectrum", rng)
    qa = re.findall(r"\b(the result|the answer|the reason|why|the catch|the problem)\? [A-Z]", text)
    if qa:
        add("MEDIUM", "question-then-answer", f"{len(qa)} rhetorical question answered in the next clause", qa)

    # --- triads
    triads = re.findall(r"\b([\w-]+), ([\w-]+),? (and|or|и|или) ([\w-]+)\b", text)
    if triads:
        lvl = "HIGH" if per_k(len(triads)) >= 2.5 or len(triads) >= 3 or (words < 300 and len(triads) >= 2) else "LOW"
        add(lvl, "triads", f"{len(triads)} group(s) of three ({per_k(len(triads))}/1000 words; AI runs 4x human)", [", ".join(t[:2]) + " " + t[2] + " " + t[3] for t in triads])

    # --- vocabulary
    found = []
    for w in TIER1:
        n = len(re.findall(r"\b" + re.escape(w) + r"\w*", low))
        if n:
            found.append(f"{w}×{n}")
    if found:
        total = sum(int(f.split("×")[1]) for f in found)
        lvl = "HIGH" if total >= 3 or per_k(total) >= 3 else "MEDIUM" if total == 2 else "LOW"
        add(lvl, "tier1-vocabulary", f"{total} Tier-1 word(s); a cluster of 2+ in a paragraph is the signal", found)
    hits = [m.group(0) for p in STOCK_PHRASES for m in re.finditer(p, low, re.I)]
    if hits:
        add("HIGH" if len(hits) >= 2 else "MEDIUM", "stock-phrases", f"{len(hits)} stock phrase(s)", hits)
    cop = re.findall(r"\b(serves|stands|acts|functions) as (a|an|the)\b|\b(boasts|showcases)\b", low)
    if cop:
        add("MEDIUM", "copula-avoidance", f"{len(cop)} dressed-up 'is' ('serves as', 'boasts'...)")

    # --- rhythm
    sents = split_sentences(text)
    lens = [word_count(s) for s in sents]
    if len(lens) >= 6:
        sd = statistics.pstdev(lens)
        mean = statistics.mean(lens)
        if sd < 5:
            add("HIGH", "sentence-uniformity", f"sentence length SD {sd:.1f} words (mean {mean:.1f}); human prose is usually >8")
        elif sd < 7:
            add("MEDIUM", "sentence-uniformity", f"sentence length SD {sd:.1f} words; could vary more")
        runs = 0
        for i in range(2, len(lens)):
            a, b, c = lens[i - 2:i + 1]
            if max(a, b, c) - min(a, b, c) <= 3 and min(a, b, c) >= 8:
                runs += 1
        if runs >= 2:
            add("MEDIUM", "same-length-runs", f"{runs} run(s) of three consecutive similar-length sentences")
        shorts = 0
        best = 0
        for n in lens:
            shorts = shorts + 1 if n <= 7 else 0
            best = max(best, shorts)
        if best >= 3:
            add("MEDIUM", "staccato", f"{best} consecutive sentences of 7 words or fewer; bullets in a prose costume")
    paras = [p for p in re.split(r"\n\s*\n", text) if word_count(p) >= 15 and not p.strip().startswith(("#", "-", "*", "```"))]
    if len(paras) >= 4:
        plens = [word_count(p) for p in paras]
        if statistics.pstdev(plens) / max(statistics.mean(plens), 1) < 0.3:
            add("MEDIUM", "paragraph-symmetry", f"{len(paras)} paragraphs all within ±30% of {statistics.mean(plens):.0f} words")

    # --- recaps and navigation
    recaps = re.findall(r"^(overall|in summary|to summarize|to sum up|ultimately|this (highlights|underscores|demonstrates))\b", low, re.M)
    if recaps:
        add("MEDIUM", "section-recaps", f"{len(recaps)} summary opener(s) at line start", [r[0] if isinstance(r, tuple) else r for r in recaps])

    # --- symbols
    emo = [e for e in UI_EMOJI if e in text]
    if emo:
        lvl = "CRITICAL" if fmt == "reply" or re.search(r"^\s*[✅✔❌🚀💡🔥⚡🎯👉📌]", text, re.M) else "HIGH"
        add(lvl, "ui-emoji", "UI-style emoji (checkmarks, rockets, keycaps run 60-170x human rate)", emo)
    odd = [c for c in ODD_UNICODE if c in text]
    if odd:
        add("MEDIUM", "unusual-unicode", "decorative Unicode glyphs", odd)
    curly = len(re.findall(r"[“”‘’«»]", text))
    if curly and fmt == "reply":
        add("MEDIUM", "curly-quotes", f"{curly} typographic quote(s) in a chat reply; keyboards produce straight quotes")

    # --- Russian
    if cyr:
        hits = [m.group(0) for p in RU_CRITICAL for m in re.finditer(p, low, re.I)]
        if hits:
            add("HIGH", "ru-markers", f"{len(hits)} Russian marker(s) (калька / канцелярит / чат-переход)", hits)
        nomin = re.findall(r"\b\w+(ание|ение|ация|изация)\b", low)
        if per_k(len(nomin)) >= 25:
            add("MEDIUM", "ru-nominalisation", f"{len(nomin)} nouns in -ание/-ение/-ация ({per_k(len(nomin))}/1000 words); check for plain verbs")
        tc = re.findall(r"^#+ (?:[А-ЯЁ][а-яё]+ ){2,}[А-ЯЁ][а-яё]+", text, re.M)
        if tc:
            add("HIGH", "ru-title-case", "Title Case in a Russian heading; Russian capitalises the first word only", tc)
        if fmt == "reply" and re.search(r"[«»]| ", text):
            add("MEDIUM", "ru-typography-in-chat", "ёлочки / non-breaking spaces in a chat reply; phones produce \"quotes\"")

    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    flags.sort(key=lambda f: order[f["level"]])
    cats = {f["category"] for f in flags if f["level"] != "LOW"}
    return {
        "format": fmt, "words": words, "sentences": len(sents),
        "distinct_flag_categories": len(cats), "flags": flags,
        "critical": any(f["level"] == "CRITICAL" for f in flags),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="file path or - for stdin")
    ap.add_argument("--format", choices=["article", "post", "reply"], default=None)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    text = sys.stdin.read() if a.path == "-" else open(a.path, encoding="utf-8").read()
    r = check(text, a.format)
    if a.json:
        print(json.dumps(r, ensure_ascii=False, indent=2))
    else:
        print(f"format={r['format']}  words={r['words']}  sentences={r['sentences']}  flag categories={r['distinct_flag_categories']}")
        if not r["flags"]:
            print("no flags")
        for f in r["flags"]:
            ex = ("  e.g. " + " | ".join(str(e) for e in f["examples"])) if f["examples"] else ""
            print(f"[{f['level']}] {f['category']}: {f['msg']}{ex}")
        if r["distinct_flag_categories"] >= 3:
            print("\n3+ flag categories: this reads as a cluster. Fix rhythm and contrast first, then words.")
    sys.exit(1 if r["critical"] else 0)


if __name__ == "__main__":
    main()
