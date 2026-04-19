---
name: php-performance
description: >
  PHP performance expert. ALWAYS invoke this skill when the user asks about PHP performance, profiling, caching, optimization, bottlenecks, Xdebug profiling, or slow code analysis.
  Do not optimize PHP code directly -- use this skill first.
argument-hint: [target]
---

# PHP 8+ — Оптимизация производительности

Оптимизируй `$ARGUMENTS`.

## Процесс

### 1. Измерь (не оптимизируй наугад!)

Перед оптимизацией **профилируй** и определи узкое место:

```php
// Простой таймер
$start = hrtime(true);
// ... код ...
$elapsed = (hrtime(true) - $start) / 1_000_000; // ms
```

### 2. Типичные проблемы и решения

| Проблема | Решение |
|----------|---------|
| N+1 запросы | JOIN / batch-загрузка |
| Нет кеша | OPcache, APCu, Redis |
| Повторные вычисления | Мемоизация |
| Большие массивы | Генераторы (yield) |
| Утечки памяти | WeakMap, unset |
| Медленные строки | Буферизация, implode |
| Синхронный I/O | Async / очереди |

### 3. OPcache — must-have

```ini
; php.ini
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0       ; 0 в production!
opcache.jit=1255                     ; JIT (PHP 8.0+)
opcache.jit_buffer_size=128M
```

### 4. Генераторы для экономии памяти

```php
// Плохо — загружает всё в память
function getAllUsers(): array
{
    return $pdo->query('SELECT * FROM users')->fetchAll();
}

// Хорошо — по одному
function getAllUsers(): \Generator
{
    $stmt = $pdo->query('SELECT * FROM users');
    while ($row = $stmt->fetch()) {
        yield $row;
    }
}

foreach (getAllUsers() as $user) {
    // Обработка по одному — памяти O(1) вместо O(n)
}
```

### 5. Решение N+1

```php
// N+1 — каждый элемент генерирует запрос
foreach ($orders as $order) {
    $customer = $customerRepo->findById($order->customerId); // N запросов!
}

// Batch — один запрос
$customerIds = array_column($orders, 'customerId');
$customers = $customerRepo->findByIds($customerIds); // 1 запрос
$customersMap = array_column($customers, null, 'id');

foreach ($orders as $order) {
    $customer = $customersMap[$order->customerId]; // O(1) lookup
}
```

### 6. Проверь результат

- Сравни время до и после
- Проверь потребление памяти (`memory_get_peak_usage()`)
- Убедись, что функциональность не пострадала

Для полной справки по OPcache, JIT, профилированию и кешированию смотри [reference.md](reference.md).
