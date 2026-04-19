---
name: bitrix-event
description: >
  Bitrix Event expert. ALWAYS invoke this skill when the user asks about Bitrix events, EventManager, event handlers, event subscriptions, OnBefore/OnAfter handlers, or custom events.
  Do not write event handlers or EventManager code directly -- use this skill first.
argument-hint: [module:event-name]
---

# Bitrix D7 — Обработчики событий

Создай обработчик для события `$ARGUMENTS`.

## Основы Event Manager D7

### Регистрация обработчика

Есть два способа — в коде (runtime) и через БД (persistent).

#### 1. Runtime-регистрация (в init.php или include.php модуля)

```php
use Bitrix\Main\EventManager;

$eventManager = EventManager::getInstance();

// D7-формат (рекомендуемый)
$eventManager->addEventHandler(
    'iblock',                                // Модуль-источник события
    '\Bitrix\Iblock\Element::OnAfterAdd',    // Имя события (D7-формат)
    ['Vendor\Module\EventHandler', 'onAfterElementAdd']  // Обработчик
);

// Совместимый формат (для старых событий)
$eventManager->addEventHandlerCompatible(
    'iblock',
    'OnAfterIBlockElementAdd',               // Старое имя события
    'Vendor\Module\EventHandler',
    'onAfterElementAdd'
);
```

#### 2. Persistent-регистрация (через модуль, сохраняется в БД)

```php
// В install/index.php модуля
$eventManager->registerEventHandler(
    'iblock',
    'OnAfterIBlockElementAdd',
    'vendor.modulename',                     // Ваш модуль
    'Vendor\\ModuleName\\EventHandler',
    'onAfterElementAdd'
);

// Удаление
$eventManager->unRegisterEventHandler(
    'iblock',
    'OnAfterIBlockElementAdd',
    'vendor.modulename',
    'Vendor\\ModuleName\\EventHandler',
    'onAfterElementAdd'
);
```

## Класс обработчика

```php
namespace Vendor\ModuleName;

use Bitrix\Main\Event;
use Bitrix\Main\EventResult;

class EventHandler
{
    /**
     * D7-событие: параметры в объекте Event
     */
    public static function onAfterElementAdd(Event $event): void
    {
        $fields = $event->getParameter('fields');
        $id = $event->getParameter('id');

        // Логика обработки
    }

    /**
     * Совместимое событие: параметры как аргументы
     */
    public static function onAfterElementAddCompatible(array &$arFields): void
    {
        $id = $arFields['ID'];
        // Логика обработки
    }

    /**
     * Отмена действия (OnBefore*)
     */
    public static function onBeforeElementAdd(Event $event): EventResult
    {
        $result = new EventResult();
        $fields = $event->getParameter('fields');

        if (empty($fields['NAME'])) {
            $result->addError(new \Bitrix\Main\Error('Name is required'));
            // Это отменит операцию добавления
        }

        return $result;
    }

    /**
     * Модификация данных (OnBefore*)
     */
    public static function onBeforeElementUpdate(Event $event): EventResult
    {
        $result = new EventResult();
        $fields = $event->getParameter('fields');

        // Модифицируем поля перед сохранением
        $result->modifyFields([
            'CODE' => \CUtil::translit($fields['NAME'], 'ru'),
        ]);

        return $result;
    }
}
```

## Кастомные события

### Создание своего события

```php
namespace Vendor\ModuleName;

use Bitrix\Main\Event;
use Bitrix\Main\EventResult;

class ItemService
{
    public function create(array $data): array
    {
        // Отправляем событие "до"
        $event = new Event(
            'vendor.modulename',           // Модуль-источник
            'onBeforeItemCreate',          // Имя события
            ['fields' => $data]            // Параметры
        );
        $event->send();

        // Проверяем, не отменили ли обработчики действие
        foreach ($event->getResults() as $eventResult) {
            if ($eventResult->getType() === EventResult::ERROR) {
                return ['success' => false, 'errors' => $eventResult->getErrors()];
            }
            // Подхватываем модифицированные поля
            $modifiedFields = $eventResult->getModified();
            if ($modifiedFields) {
                $data = array_merge($data, $modifiedFields);
            }
        }

        // Основная логика
        $result = ItemTable::add($data);

        // Отправляем событие "после"
        $afterEvent = new Event(
            'vendor.modulename',
            'onAfterItemCreate',
            ['id' => $result->getId(), 'fields' => $data]
        );
        $afterEvent->send();

        return ['success' => true, 'id' => $result->getId()];
    }
}
```

### Подписка на кастомное событие

```php
$eventManager->addEventHandler(
    'vendor.modulename',
    'onAfterItemCreate',
    function (Event $event) {
        $id = $event->getParameter('id');
        // Обработка...
    }
);
```

## Часто используемые события

### Модуль main

| Событие | Когда |
|---------|-------|
| `OnPageStart` | Начало выполнения страницы |
| `OnBeforeProlog` | Перед прологом |
| `OnProlog` | Пролог |
| `OnEpilog` | Эпилог |
| `OnAfterEpilog` | После эпилога |
| `OnBeforeUserLogin` | Перед авторизацией |
| `OnAfterUserLogin` | После авторизации |
| `OnBeforeUserRegister` | Перед регистрацией |
| `OnAfterUserRegister` | После регистрации |
| `OnBeforeUserUpdate` | Перед обновлением пользователя |
| `OnAfterUserUpdate` | После обновления пользователя |

### Модуль iblock

| Событие | Когда |
|---------|-------|
| `OnBeforeIBlockElementAdd` | Перед добавлением элемента |
| `OnAfterIBlockElementAdd` | После добавления элемента |
| `OnBeforeIBlockElementUpdate` | Перед обновлением элемента |
| `OnAfterIBlockElementUpdate` | После обновления элемента |
| `OnBeforeIBlockElementDelete` | Перед удалением элемента |
| `OnAfterIBlockElementDelete` | После удаления элемента |
| `OnBeforeIBlockSectionAdd` | Перед добавлением раздела |
| `OnAfterIBlockSectionAdd` | После добавления раздела |

### ORM-события (автоматические для любого DataManager)

| Событие | Паттерн |
|---------|---------|
| До добавления | `\Vendor\Module\EntityTable::OnBeforeAdd` |
| После добавления | `\Vendor\Module\EntityTable::OnAfterAdd` |
| До обновления | `\Vendor\Module\EntityTable::OnBeforeUpdate` |
| После обновления | `\Vendor\Module\EntityTable::OnAfterUpdate` |
| До удаления | `\Vendor\Module\EntityTable::OnBeforeDelete` |
| После удаления | `\Vendor\Module\EntityTable::OnAfterDelete` |

## Best Practices

1. **Располагай обработчики в отдельном классе** — `EventHandler`, не в `init.php`
2. **Проверяй контекст** — фильтруй по IBLOCK_ID, типу и т.д., чтобы не обрабатывать чужие события
3. **Не блокируй** — обработчики должны быть быстрыми, тяжёлые операции — в агенты
4. **OnBefore* может отменить действие** — используй `EventResult` с ошибками или модификацией
5. **Persistent-регистрация для модулей** — `registerEventHandler` в InstallEvents()
6. **Runtime-регистрация для init.php** — `addEventHandler`
7. **Логируй ошибки** — не глотай исключения в обработчиках
