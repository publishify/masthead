---
description: Run the editorial board on a book file.
argument-hint: <file> [genre] [title]
model: haiku
---

The author wrote: $ARGUMENTS

The book file must be in the current folder. If it is not, tell the author to open Claude in the book's folder and stop. Never read the book.

Pick the genre from: novel, novella, short-story, flash-fiction, poetry, essay, academic-essay, academic-article, academic-book, memoir, biography, non-fiction, children-ya, play, screenplay, other. Use `other` if unclear. Use the author's title, or the file name without its extension.

Start this one command with the Bash tool using `run_in_background: true`, then wait to be notified. A browser may open once for sign-in.

`node "${CLAUDE_PLUGIN_ROOT}/scripts/bin/masthead.mjs" run "<file>" --genre <genre> --title "<title>"`

When it finishes it prints JSON. In the language the author uses, in plain words, say the report is open, give up to three `decisions`, the minutes it took and `cost_usd`, and say these are AI readings and reader cards are simulations. Never say the book is or is not ready. If `incomplete` is not empty, tell the author plainly which reading could not be completed. If it printed `NO_LICENSE`, say this account has no Masthead access.
