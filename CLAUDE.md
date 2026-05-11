# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

push-cat -- одновременно marketplace плагинов Claude Code и каталог личных skills/commands/CLAUDE.md. Содержимое лежит в `plugins/` (публикуемые namespaced плагины) и `standalone/` (личная плоская часть). Утилита `push-cat.mjs` синхронизирует standalone-часть в `~/.claude/` и регенерирует `marketplace.json` из манифестов плагинов.

## Запуск

```
node push-cat.mjs
```

или через npm:

```
npm run push-cat
```

Интерактивный CLI: четыре режима — CLAUDE.md, standalone skills, standalone commands, регенерация marketplace.json.

## Структура

- `push-cat.mjs` -- единственный исполняемый файл, весь код в нём
- `.claude-plugin/marketplace.json` -- автогенерится из `plugins/*/.claude-plugin/plugin.json`, в репо коммитится
- `plugins/<name>/.claude-plugin/plugin.json` -- манифест плагина (`name`, `description`, `version`, `author`)
- `plugins/<name>/skills/<skill>/SKILL.md` -- скиллы плагина, доступны как `/<name>:<skill>`
- `plugins/<name>/commands/<cmd>.md` -- команды плагина, доступны как `/<name>:<cmd>`
- `standalone/CLAUDE-GLOBAL.md` -- источник для `~/.claude/CLAUDE.md`
- `standalone/skills/<имя>/SKILL.md` -- личные скиллы, копируются в `~/.claude/skills/<имя>/`
- `standalone/commands/<имя>/*.md` -- личные команды, копируются в `~/.claude/commands/<имя>/`
- `config/profile/` -- личные референсы, вне синка

## Стек

Node.js ESM (`"type": "module"`). Зависимости: `@inquirer/prompts` (интерактивный ввод), `chalk` (цветной вывод). Без сборки, без тестов, без линтера.

## Особенности

- Внутри плагина skills/commands не поддерживают вложенность — структура плоская
- Регенерация `marketplace.json` обязательна после добавления плагина или изменения версии/описания: `npm run push-cat` → отметить Marketplace
- Контент -- markdown со специфичным для Claude Code frontmatter (`description`, `allowed-tools`, `arguments` и т.д.)
