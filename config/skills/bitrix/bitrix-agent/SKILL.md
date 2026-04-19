---
name: bitrix-agent
description: >
  Bitrix Agent expert. ALWAYS invoke this skill when the user asks about Bitrix agents, periodic tasks, background processing, CAgent, AddAgent, or scheduled background tasks in Bitrix.
  Do not create Bitrix agents directly -- use this skill first.
argument-hint: [agent-name]
---

# Bitrix D7 — Создание агента

Создай агент `$ARGUMENTS` для выполнения периодических задач.

## Что такое агент

Агент — функция, которая периодически вызывается системой Bitrix. Агент **должен вернуть строку** с вызовом самого себя для повторного выполнения.

## Создание агента

### 1. Класс агента

```php
namespace Vendor\ModuleName\Agent;

use Bitrix\Main\Diag\Debug;

class CleanupAgent
{
    /**
     * Метод-агент. ОБЯЗАН вернуть строку с вызовом самого себя.
     * Если вернуть пустую строку — агент удалится.
     */
    public static function run(): string
    {
        try {
            static::execute();
        } catch (\Throwable $e) {
            // Логирование, но НЕ выброс исключения!
            Debug::writeToFile(
                $e->getMessage(),
                'CleanupAgent error',
                '/local/logs/agents.log'
            );
        }

        // Возврат строки = повторный запуск
        return static::class . '::run();';
    }

    private static function execute(): void
    {
        // Основная логика
        // Пример: очистка устаревших записей
        $connection = \Bitrix\Main\Application::getConnection();
        $connection->queryExecute(
            "DELETE FROM vendor_module_log WHERE CREATED_AT < DATE_SUB(NOW(), INTERVAL 30 DAY)"
        );
    }
}
```

### 2. Регистрация агента

#### Через API (в установщике модуля)

```php
\CAgent::AddAgent(
    'Vendor\\ModuleName\\Agent\\CleanupAgent::run();',  // Вызываемая строка
    'vendor.modulename',    // ID модуля (пусто для общих)
    'N',                    // Периодичность: N = от завершения, Y = абсолютная
    86400,                  // Интервал (секунды): 86400 = 24 часа
    '',                     // Дата первой проверки (пусто = сейчас)
    'Y',                    // Активен
    '',                     // Дата первого запуска (пусто = сейчас + интервал)
    100                     // Сортировка
);
```

#### Через админку

Настройки → Настройки продукта → Агенты → Добавить.

### 3. Периодичность

| Тип | `IS_PERIOD` | Поведение |
|-----|-------------|-----------|
| Относительная | `N` | Следующий запуск = время завершения + интервал |
| Абсолютная | `Y` | Следующий запуск = плановое время + интервал (даже если агент задержался) |

**Рекомендация**: Используй `N` (относительная) для большинства случаев. Абсолютная — только когда критично точное расписание.

### 4. Удаление агента

```php
// Удалить конкретный агент
\CAgent::RemoveAgent(
    'Vendor\\ModuleName\\Agent\\CleanupAgent::run();',
    'vendor.modulename'
);

// Удалить все агенты модуля (при деинсталляции)
\CAgent::RemoveModuleAgents('vendor.modulename');
```

## Best Practices

1. **Всегда возвращай строку вызова** — иначе агент удалится навсегда
2. **Оборачивай в try/catch** — необработанное исключение убьёт агент
3. **Не на хитах** — не выполняй тяжёлые агенты на хитах пользователей. Используй `cron` режим (`define('BX_CRONTAB_SUPPORT', true)` в `.settings.php`)
4. **Короткое время выполнения** — агент не должен работать дольше нескольких секунд. Для длинных задач — разбей на порции
5. **Логируй** — записывай ошибки в файл через `Debug::writeToFile()`
6. **Не меняй глобальное состояние** — агент может выполняться в любом контексте
7. **Idempotent** — агент должен корректно обрабатывать повторный запуск

## Cron-режим

Для production рекомендуется запускать агенты через cron, а не на хитах:

```bash
# /etc/cron.d/bitrix
*/5 * * * * www-data /usr/bin/php -f /var/www/html/bitrix/modules/main/tools/cron_events.php
```

В `.settings.php`:
```php
'agents' => [
    'value' => [
        'crontab' => true,
    ],
],
```

## Порционная обработка

```php
class ImportAgent
{
    private const BATCH_SIZE = 100;

    public static function run(): string
    {
        $processed = static::processBatch();

        if ($processed >= self::BATCH_SIZE) {
            // Ещё есть данные — запустить снова через 1 секунду
            // (вернётся как следующий вызов агента)
            return static::class . '::run();';
        }

        // Всё обработано — стандартный интервал
        return static::class . '::run();';
    }

    private static function processBatch(): int
    {
        $items = PendingImportTable::getList([
            'filter' => ['=PROCESSED' => 'N'],
            'limit' => self::BATCH_SIZE,
        ])->fetchAll();

        foreach ($items as $item) {
            // Обработка...
            PendingImportTable::update($item['ID'], ['PROCESSED' => 'Y']);
        }

        return count($items);
    }
}
```
