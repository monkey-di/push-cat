# push-cat

Каталог skills, slash-команд и глобального `CLAUDE.md` для [Claude Code](https://claude.ai/code) с утилитой синхронизации в `~/.claude/`.

## Зачем

Claude Code читает skills, commands и глобальные инструкции из `~/.claude/`. Хранить это всё прямо там неудобно: нет версионирования, нет нормальной организации по группам, тяжело шарить между машинами. `push-cat` решает обе задачи: содержимое лежит в `config/` под git, утилита раскладывает его в `~/.claude/`.

## Установка

```bash
npm install
```

## Запуск

```bash
npm run push-cat
```

или напрямую:

```bash
node push-cat.mjs
```

Интерактивный CLI спросит, что синхронизировать (CLAUDE.md, skills, commands), и обработает конфликты с уже существующими файлами в `~/.claude/`.

## Структура

```
config/
├── CLAUDE-GLOBAL.md          → ~/.claude/CLAUDE.md
├── skills/
│   └── <группа>/<имя>/SKILL.md  → ~/.claude/skills/<имя>/SKILL.md
└── commands/
    └── <группа>/<имя>.md     → ~/.claude/commands/<имя>/...
```

- **Skills** определяются по наличию `SKILL.md` в папке.
- **Commands** -- по наличию любого `.md` в папке.
- Группы (`bitrix/`, `git/`, `sdlc/` и т.д.) -- организационные, при синхронизации **выравниваются в плоскую структуру**: Claude Code не поддерживает вложенность в `~/.claude/skills/` и `~/.claude/commands/`.

## Как добавить свой skill / command

1. Создать папку под нужной группой в `config/skills/` или `config/commands/`.
2. Положить туда `SKILL.md` (для skill) или `.md`-файлы (для command) с правильным frontmatter (`description`, `allowed-tools`, `arguments` и т.д. -- см. [docs Claude Code](https://docs.claude.com/en/docs/claude-code)).
3. Запустить `npm run push-cat`.

## Стек

Node.js ESM. Зависимости: `@inquirer/prompts`, `chalk`. Без сборки, тестов и линтера -- весь код в `push-cat.mjs`.
