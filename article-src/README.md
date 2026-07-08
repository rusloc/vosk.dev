# Article source drop

Paste the **old article** here for me to convert into a blog post
(`content/blog/<slug>.mdx`). Anything in this folder is a raw working input —
it's **outside** the validated MDX pipeline, so nothing here affects the build.

## What to drop

Any one of these is enough:

- The article's **HTML** (view-source or a saved `.html` file), or
- The article as **Markdown** / plain text (a `.md` / `.txt` paste), or
- Just the **URL** — you can paste it straight into chat and skip this folder.

## Images (optional)

If the article has images, drop the original files in `article-src/images/`.
I'll move them into `public/images/blog/<slug>/…` during conversion.
(The old site may block hotlinking, so originals are safer than URLs.)

## When ready

Tell me "article's in `article-src/`" (or paste the URL) and I'll:
1. extract title / body / date / images,
2. convert to MDX with validated frontmatter,
3. write `content/blog/<slug>.mdx`,
4. proofread the rendered post, then run typecheck + lint + build.
