---
description: "Клонировать репозиторий в текущий непустой каталог (например, с .idea)"
allowed-tools: ["Bash"]
arguments:
  - name: repo_url
    description: "URL репозитория (HTTPS или SSH)"
    required: true
---

# /git:clone-here

Клонируй репозиторий `$ARGUMENTS.repo_url` в текущий рабочий каталог, который уже может содержать файлы (`.idea`, конфиги IDE и т.д.).

Обычный `git clone` не работает в непустой директории, поэтому используй последовательность:

```bash
git init
git remote add origin $ARGUMENTS.repo_url
git fetch origin
git checkout -t origin/master 2>/dev/null || git checkout -t origin/main 2>/dev/null || {
  # Определить дефолтную ветку из remote HEAD
  DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')
  if [ -n "$DEFAULT_BRANCH" ]; then
    git checkout -t "origin/$DEFAULT_BRANCH"
  else
    echo "Не удалось определить основную ветку. Доступные ветки:"
    git branch -r
    exit 1
  fi
}
```

После клонирования:
1. Убедись что `git status` показывает чистое состояние (untracked файлы вроде `.idea/` допустимы)
2. Покажи текущую ветку и последний коммит
3. Если в каталоге есть `.gitignore` из репозитория, проверь что локальные файлы (`.idea/`) уже в нём или предложи добавить
