# Publishify Masthead install guide

Masthead is an AI editorial board that reads your book the way a publishing house staff would. You do not need to know programming: you will paste a few lines and press Enter.

> **Free to try.** Every month you can review the first 10,000 words of a book at no charge. For a larger plan, write to info@publishify.app.

## 1. What you need

- A paid [Claude](https://claude.com/pricing) account
- [Claude Code](https://claude.com/claude-code): follow the install steps on that page
- [Node.js](https://nodejs.org): download the version marked LTS and install it like any other app
- A Google account, to sign in

## 2. Open Terminal

- **Mac:** press `Cmd` + `Space`, type `Terminal`, press Enter.
- **Windows:** open the Start menu, type `Terminal`, press Enter.

## 3. Go to your book's folder

Type `cd`, then a space, then drag your book's folder into the Terminal window and press Enter. Then start Claude:

```
claude
```

## 4. Add Masthead

Inside Claude, paste these one at a time and press Enter after each:

```
/plugin marketplace add publishify/masthead
```

```
/plugin install masthead@publishify
```

Choose **Install for you**. Then type `/exit`, run `claude` again, and Masthead is ready.

## 5. Review your book

```
/masthead:review my-book.docx novel
```

Use your own file name. The first time, a browser opens: choose **Continue with Google** and sign in with your Google account.

When the review is done, the report opens by itself. It is saved in the same folder as `masthead-dashboard.html`. To see it again later:

```
/masthead:status
```

**Files you can use:** Word (`.docx`), EPUB without copy protection (`.epub`), Markdown (`.md`) and plain text (`.txt`).

**Kinds of book:** `novel`, `novella`, `short-story`, `memoir`, `biography`, `play`. In beta: `essay`, `flash-fiction`, `non-fiction`.

## If something goes wrong

| What you see                              | What to do                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `claude: command not found`               | Install Claude Code, then close and reopen Terminal                                 |
| `node: command not found`                 | Install Node.js, then close and reopen Terminal                                     |
| It says the allowance is used up (`PLAN_LIMIT`) | Your words renew on the first of next month. For a larger plan, write to info@publishify.app |
| It cannot find your file                  | Make sure Claude was started in your book's folder                                  |
| It stops at your usage limit              | Wait until the limit resets and run the same command; finished work is not repeated |

## Update or remove

Type `/plugin` in Claude, choose **masthead**, then update or uninstall it.

AI can make mistakes, so read every note with your own judgement.

[Türkçe](install.tr.md)
