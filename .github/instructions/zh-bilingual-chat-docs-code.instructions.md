---
description: 'Chinese conversation rules, English-only code comments, and synchronized bilingual documentation policy (-zh)'
applyTo: '**'
---

# Chinese Conversation + English Code Comments + Bilingual Docs

This instruction enforces three policies across conversations, code generation, and documentation output.

## Conversation Policy (Chinese-first)

- When the user converses in Chinese, respond in Chinese.
- In the response text (chat replies only, not files):
  - For any English abbreviations (e.g., "CPU"), immediately add the English full name in parentheses, e.g., `CPU (Central Processing Unit)`.
  - Only expand the abbreviation or key term on its first appearance within the same session; skip repeated expansions later
  - For technical terms that have both Chinese and English names, always show the **English term first**, followed by IPA, then optionally the Chinese translation in parentheses. Format: `English /IPA/` or `English /IPA/ (中文)`.
  - For any English words, the IPA transcription MUST appear **immediately to the right** of the word, with no other text in between. Examples:
    - ✅ Correct: `circuit breaker /ˈsɜːrkɪt ˈbreɪkər/ (断路器)` or `reverse /rɪˈvɜːrs/ engineering`
    - ✅ Correct: `实现断路器 circuit breaker /ˈsɜːrkɪt ˈbreɪkər/ 模式`
    - ❌ Wrong: `断路器 /ˈsɜːrkɪt ˈbreɪkər/` (missing English term)
    - ❌ Wrong: placing IPA at end of sentence, or separating word and IPA with other content
  - Apply IPA inline as each English word appears; do not batch them at the end of a sentence or paragraph.
  - These phonetic annotations must only appear in the agent's chat response and MUST NOT be inserted into generated files (code, comments, or documentation).

## Code Generation Policy (English-only comments)

- When adding comments to code in any language, use English for all comments.
- Do not insert Chinese comments into source code.
- Keep comments concise, objective, and implementation-focused. Prefer imperative style (e.g., "Validate input", "Return early on error").

## Documentation Policy (Bilingual with synchronized -zh)

- Default documentation is written in English.
- For every documentation file created or updated, also create/update a sibling Chinese file with the `-zh` suffix before the extension.
  - Examples: `README.md` → `README-zh.md`, `api-guide.md` → `api-guide-zh.md`.
- Keep the English and Chinese documents synchronized:
  - Any change to the English file MUST be mirrored in the `-zh` file in the same structure (sections, headings, lists, code blocks).
  - If a section is added/removed/modified in English, apply the same structural change to the `-zh` file and translate the content accordingly.
  - If content is intentionally different across languages (rare), clearly mark the divergence at the top of the differing section in both files with a short note.
- Place language-switch links at the top of both files:
  - English file: `This document is also available in [Chinese](./<name>-zh.md).`
  - Chinese file: `本文档亦提供[英文版](./<name>.md)。`
- Do not include IPA or abbreviation expansions within documentation unless they are technically relevant to the document content. The IPA rule applies only to chat responses.

## File Naming and Placement

- Keep bilingual files side-by-side in the same directory to simplify maintenance.
- Use hyphenated lowercase for new doc filenames, except conventional names like `README.md`.

## Validation Checklist

- Conversation in Chinese → reply in Chinese; abbreviations expanded; English words annotated with IPA in chat only.
- Code changes → all comments are in English.
- Docs → English default + synchronized `-zh` file created/updated, with language-switch links.
