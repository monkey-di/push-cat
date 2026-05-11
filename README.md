# push-cat

Каталог skills, slash-команд и глобального `CLAUDE.md` для [Claude Code](https://claude.ai/code). Один репозиторий выполняет две роли:

- **Плагины** для установки через `/plugin marketplace add monkey-di/push-cat` — namespaced скиллы и команды, ставятся одной командой у любого пользователя.
- **Standalone-конфиг** для собственного `~/.claude/` — `CLAUDE.md` и личные плоские скиллы/команды, синхронизируются утилитой `push-cat.mjs`.

## Структура

```
push-cat/
├── .claude-plugin/
│   └── marketplace.json          # автогенерится из plugins/
├── plugins/                       # публикуемая часть
│   ├── bitrix/                    # /bitrix:agent, /bitrix:component, ...
│   ├── bitrix-cdd/                # /bitrix-cdd:data-requirements-analyzer, ...
│   ├── php/                       # /php:class, /php:pattern, ...
│   ├── context-engineering/       # /context-engineering:decompose, ...
│   ├── git/                       # /git:clone-here
│   └── sdlc/                      # /sdlc:1-define-new-task, ...
├── standalone/                    # личная часть, не публикуется как плагины
│   ├── CLAUDE-GLOBAL.md           → ~/.claude/CLAUDE.md
│   ├── skills/<имя>/SKILL.md      → ~/.claude/skills/<имя>/SKILL.md
│   └── commands/<имя>/*.md        → ~/.claude/commands/<имя>/*.md
├── config/profile/                # личные референсы, вне синка
└── push-cat.mjs                   # утилита синка и регенерации marketplace
```

## Использование как marketplace плагинов

```
/plugin marketplace add monkey-di/push-cat
/plugin install bitrix@push-cat
/plugin install php@push-cat
```

Доступные плагины (см. `marketplace.json`): `bitrix`, `bitrix-cdd`, `php`, `context-engineering`, `git`, `sdlc`. Каждый плагин даёт namespaced слэш-команды, например `/bitrix:iblock`, `/sdlc:1-define-new-task`.

## Использование как личного синка

```bash
npm install
npm run push-cat        # или: node push-cat.mjs
```

Интерактивный CLI спросит, что синхронизировать:

1. **CLAUDE.md** — `standalone/CLAUDE-GLOBAL.md` → `~/.claude/CLAUDE.md` (с разрешением конфликтов).
2. **Standalone skills** — папки из `standalone/skills/` копируются в `~/.claude/skills/` плоско.
3. **Standalone commands** — папки из `standalone/commands/` копируются в `~/.claude/commands/` плоско.
4. **Marketplace** — регенерация `.claude-plugin/marketplace.json` из манифестов в `plugins/*/.claude-plugin/plugin.json`. Запускать после добавления нового плагина или изменения версии/описания.

## Добавить новый плагин

1. Создать `plugins/<name>/.claude-plugin/plugin.json` (поля: `name`, `description`, `version`, `author`).
2. Положить скиллы в `plugins/<name>/skills/<skill-name>/SKILL.md` и/или команды в `plugins/<name>/commands/<cmd>.md`.
3. Запустить `npm run push-cat` и отметить **Marketplace** — он перепишет `marketplace.json`.
4. Закоммитить и запушить — пользователи получат новый плагин.

## Добавить личный (standalone) skill или command

1. Положить в `standalone/skills/<имя>/SKILL.md` или `standalone/commands/<имя>/*.md`.
2. Запустить `npm run push-cat`, отметить нужный раздел.

## Стек

Node.js ESM. Зависимости: `@inquirer/prompts`, `chalk`. Без сборки, тестов и линтера — весь код в `push-cat.mjs`.
