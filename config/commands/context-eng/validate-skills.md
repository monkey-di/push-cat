---
description: "Validate SKILL.md descriptions against the directive activation template"
---

# /context-eng:validate-skills

Validate all SKILL.md files in the project (or in `config/skills/` if this is the push-cc-cat catalog) against the directive description format that ensures reliable skill activation.

## Required format

Every `description` field in SKILL.md frontmatter MUST follow this structure:

```
<Domain> expert. ALWAYS invoke this skill when the user asks about <trigger topics>. Do not <alternative action> directly -- use this skill first.
```

Three mandatory components:

1. **Domain identifier** -- starts with a clear domain label ending in "expert." (e.g. "Bitrix D7 ORM expert.", "PHP security expert.")
2. **ALWAYS invoke** -- contains the exact phrase "ALWAYS invoke this skill when" followed by explicit trigger topics. No soft language ("Use when", "Consider using", "Helpful for").
3. **Negative constraint** -- contains "Do not" + "directly" + "use this skill first", blocking the model from bypassing the skill.

## Validation procedure

1. Find all `SKILL.md` files recursively in the target directory.
2. Parse the YAML frontmatter of each file. Extract the `description` field.
3. Check each description against these rules:
   - Contains a domain identifier ending in "expert."
   - Contains "ALWAYS invoke this skill when"
   - Contains "Do not" ... "directly" ... "use this skill first"
   - Written entirely in English (no mixed languages)
   - Trigger topics are specific, not vague (e.g. "DataManager, ORM entities" not just "ORM stuff")
4. Report results as a table:

```
| Skill | Status | Issues |
|-------|--------|--------|
| bitrix-orm | OK | -- |
| php-class | FAIL | Missing "ALWAYS invoke", uses "Use when" |
```

5. For each failing skill, show the current description and propose a corrected version.
6. Ask the user before applying fixes.

## Why this matters

Empirical testing (650 trials) shows the directive format produces 20x better activation odds than passive descriptions. Passive wording ("Use when...") drops to 37% activation in some environments. The directive template with "ALWAYS invoke" + negative constraint achieves 94-100%.

Source: https://medium.com/@ivan.seleznov1/why-claude-code-skills-dont-activate-and-how-to-fix-it-86f679409af1
