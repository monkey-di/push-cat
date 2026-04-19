---
name: php-class
description: >
  PHP 8+ class design expert. ALWAYS invoke this skill when the user asks about creating PHP classes, readonly classes, enums, strict typing, or refactoring classes to modern PHP 8+.
  Do not scaffold PHP classes directly -- use this skill first.
argument-hint: [class-name]
---

# PHP 8+ — Создание класса

Создай класс `$ARGUMENTS` с использованием современного PHP 8+ синтаксиса.

## Процесс

### 1. Определи тип

| Тип | Когда |
|-----|-------|
| `class` | Основная единица логики |
| `readonly class` | Immutable данные (DTO, Value Object) |
| `abstract class` | Базовый класс с общей логикой |
| `interface` | Контракт без реализации |
| `trait` | Переиспользуемое поведение (mixin) |
| `enum` | Фиксированный набор значений |

### 2. Шаблон класса

```php
<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepositoryInterface;

final class UserService
{
    public function __construct(
        private readonly UserRepositoryInterface $repository,
    ) {}

    public function findById(int $id): ?User
    {
        return $this->repository->findById($id);
    }
}
```

### 3. Принципы

- **`final` по умолчанию** — открывай для наследования только когда это осознанный выбор
- **Constructor promotion** — для свойств, инициализируемых через конструктор
- **`readonly`** — для свойств, которые не должны меняться после создания
- **Dependency Injection** — зависимости через конструктор, по интерфейсу
- **Trailing comma** — в параметрах, аргументах, use-списках
- **Один класс = одна ответственность** (SRP)

### 4. Проверь

- `declare(strict_types=1)` в начале файла
- Все свойства и параметры типизированы
- Возвращаемые типы указаны (включая `void`)
- Namespace соответствует расположению файла (PSR-4)
- `final` если класс не предназначен для наследования
- `readonly` для immutable свойств/классов

Для полной справки смотри [reference.md](reference.md).
