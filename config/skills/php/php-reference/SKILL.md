---
name: php-reference
description: PHP 8+ standards expert. ALWAYS invoke this skill when working with PHP files, composer.json, phpunit.xml, or PHPStan/Psalm configs. Do not assume PHP conventions from memory -- use this skill first for PSR standards and best practices reference.
user-invocable: false
---

# PHP 8+ — Конвенции и Best Practices

## Обязательные правила

### 1. Strict types — всегда

```php
<?php

declare(strict_types=1);
```

Каждый PHP-файл **обязан** начинаться с `declare(strict_types=1)`. Без исключений.

### 2. Типизация

- Все параметры функций/методов — типизированы
- Все возвращаемые значения — типизированы (включая `void`)
- Свойства классов — типизированы
- Используй `?Type` для nullable, `Type1|Type2` для union types
- Используй `never` для методов, которые всегда бросают исключение или завершают процесс
- Избегай `mixed` — используй только когда действительно может быть что угодно

```php
// Правильно
function findUser(int $id): ?User { ... }
function process(string|int $value): void { ... }
function fail(): never { throw new \RuntimeException('...'); }

// Неправильно
function findUser($id) { ... }
```

### 3. Именование

| Элемент | Стиль | Пример |
|---------|-------|--------|
| Класс / Interface / Trait / Enum | PascalCase | `UserRepository`, `Cacheable` |
| Метод / Функция | camelCase | `getUserById()`, `formatDate()` |
| Переменная / Свойство | camelCase | `$userName`, `$isActive` |
| Константа | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Namespace | PascalCase | `App\Service\User` |
| Файл (PSR-4) | Совпадает с классом | `UserRepository.php` |

### 4. Организация класса

```php
class Example
{
    // 1. Константы
    // 2. Свойства (static → instance, public → private)
    // 3. Конструктор
    // 4. Публичные методы
    // 5. Защищённые методы
    // 6. Приватные методы
}
```

### 5. Предпочтения PHP 8+

| Вместо | Используй |
|--------|-----------|
| `switch` (простые случаи) | `match` |
| `isset($a) ? $a : $b` | `$a ?? $b` |
| `$obj !== null ? $obj->method() : null` | `$obj?->method()` |
| Массив-конфиг | Enum |
| Геттеры/сеттеры для immutable | `readonly` свойства |
| Конструктор + присваивание | Constructor promotion |
| `@throws` без catch | Typed exceptions hierarchy |

## Антипаттерны

1. **Без `declare(strict_types=1)`** — скрытые баги из-за приведения типов
2. **`@`-оператор подавления ошибок** — скрывает реальные проблемы
3. **`extract()`** — создаёт переменные из ниоткуда, невозможно отследить
4. **`eval()`** — уязвимость и нечитаемость
5. **`global $var`** — используй DI
6. **`else` после `return`** — early return вместо вложенности
7. **Массивы вместо объектов** — используй DTO/Value Objects
8. **God-класс** — класс делает слишком много (> 200–300 строк — повод задуматься)
9. **Магические строки/числа** — используй константы или enum

## Документация

- PHPDoc **только** когда тип невыразим в PHP (generics, array shapes)
- Не дублируй в PHPDoc то, что уже выражено в сигнатуре
- `@param`, `@return` — только для дополнительной информации (generics)
- `@throws` — указывай какие исключения может бросить метод
- `@phpstan-*` / `@psalm-*` — для статического анализа

```php
// Правильно — PHPDoc добавляет информацию, которой нет в сигнатуре
/** @param array<string, int> $scores */
public function calculateAverage(array $scores): float

// Неправильно — дублирование сигнатуры
/** @param int $id @return User|null */
public function findById(int $id): ?User
```

Для полной справки по PHP 8 фичам смотри [php8-features.md](php8-features.md).
Для PSR-стандартов смотри [psr-standards.md](psr-standards.md).
