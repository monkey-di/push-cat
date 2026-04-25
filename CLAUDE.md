# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

push-cat (Claude Code Catalog) -- каталог skills, commands и глобального CLAUDE.md для Claude Code. Основная работа -- создание и редактирование контента в `config/`. Утилита `push-cat.mjs` синхронизирует каталог в `~/.claude/`.

## Запуск

```
node push-cat.mjs
```

или через npm:

```
npm run push-cat
```

Интерактивный CLI: предлагает выбрать что синхронизировать (CLAUDE.md, skills, commands), обрабатывает конфликты.

## Структура

- `push-cat.mjs` -- единственный исполняемый файл, весь код в нём
- `config/CLAUDE-GLOBAL.md` -- источник для `~/.claude/CLAUDE.md`
- `config/skills/<группа>/<имя-скилла>/SKILL.md` -- скиллы, вложенность произвольная, при синхронизации выравниваются в плоскую структуру `~/.claude/skills/<имя-скилла>/`
- `config/commands/<группа>/<имя>.md` -- команды, аналогично выравниваются в `~/.claude/commands/<имя>/`

## Стек

Node.js ESM (`"type": "module"`). Зависимости: `@inquirer/prompts` (интерактивный ввод), `chalk` (цветной вывод). Без сборки, без тестов, без линтера.

## Особенности

- Skills определяются по наличию `SKILL.md` в папке, commands -- по наличию любого `.md`
- Вложенные папки в `~/.claude/skills/` и `~/.claude/commands/` не поддерживаются Claude Code, поэтому скрипт выполняет flattening при копировании
- Содержимое `config/` -- markdown-файлы со специфичным для Claude Code frontmatter (`description`, `allowed-tools`, `arguments` и т.д.)
