---
name: bitrix-rest
description: >
  Bitrix REST API expert. ALWAYS invoke this skill when the user asks about Bitrix REST API, placements, REST endpoints, REST integrations, or embedding UI via placements.
  Do not write Bitrix REST endpoints or placement handlers directly -- use this skill first.
argument-hint: [method-name]
---

# Bitrix D7 — REST API метод

Создай REST API метод `$ARGUMENTS`.

## Способы создания REST-методов

### 1. Через D7 Controller (рекомендуемый)

Самый современный способ — через контроллеры D7 с автоматическим REST-интерфейсом.

```php
namespace Vendor\ModuleName\Controller;

use Bitrix\Main\Engine\Controller;
use Bitrix\Main\Engine\ActionFilter;
use Bitrix\Main\Error;

class Item extends Controller
{
    public function configureActions(): array
    {
        return [
            'list' => [
                'prefilters' => [
                    new ActionFilter\Authentication(),
                    new ActionFilter\HttpMethod([
                        ActionFilter\HttpMethod::METHOD_GET,
                    ]),
                ],
            ],
            'get' => [
                'prefilters' => [
                    new ActionFilter\Authentication(),
                ],
            ],
            'create' => [
                'prefilters' => [
                    new ActionFilter\Authentication(),
                    new ActionFilter\HttpMethod([
                        ActionFilter\HttpMethod::METHOD_POST,
                    ]),
                    new ActionFilter\Csrf(),
                ],
            ],
        ];
    }

    public function listAction(int $page = 1, int $limit = 20): array
    {
        $items = \Vendor\ModuleName\ItemTable::getList([
            'select' => ['ID', 'NAME', 'CODE'],
            'filter' => ['=ACTIVE' => 'Y'],
            'limit' => $limit,
            'offset' => ($page - 1) * $limit,
        ])->fetchAll();

        return ['items' => $items, 'page' => $page];
    }

    public function getAction(int $id): ?array
    {
        $item = \Vendor\ModuleName\ItemTable::getById($id)->fetch();
        if (!$item) {
            $this->addError(new Error('Item not found', 404));
            return null;
        }
        return $item;
    }

    public function createAction(string $name, string $code): ?array
    {
        $result = \Vendor\ModuleName\ItemTable::add([
            'NAME' => $name,
            'CODE' => $code,
        ]);

        if (!$result->isSuccess()) {
            foreach ($result->getErrorMessages() as $message) {
                $this->addError(new Error($message));
            }
            return null;
        }

        return ['id' => $result->getId()];
    }
}
```

Вызов: `POST /bitrix/services/main/ajax.php?action=vendor:modulename.api.item.list`

### 2. Через модуль REST (для внешних приложений)

Для интеграции с внешними приложениями через OAuth.

```php
// В lib/resthandler.php
namespace Vendor\ModuleName;

use Bitrix\Main\Loader;

class RestHandler
{
    /**
     * Регистрация REST-методов через событие
     */
    public static function onRestServiceBuildDescription(): array
    {
        return [
            'vendor.modulename' => [  // Scope
                'vendor.modulename.item.list' => [
                    'callback' => [static::class, 'itemList'],
                    'options' => [],
                ],
                'vendor.modulename.item.get' => [
                    'callback' => [static::class, 'itemGet'],
                    'options' => [],
                ],
                'vendor.modulename.item.add' => [
                    'callback' => [static::class, 'itemAdd'],
                    'options' => [],
                ],
            ],
        ];
    }

    public static function itemList(array $query, int $n, \CRestServer $server): array
    {
        Loader::requireModule('vendor.modulename');

        $page = max(1, (int)($query['page'] ?? 1));
        $limit = min(50, max(1, (int)($query['limit'] ?? 20)));

        $items = ItemTable::getList([
            'select' => ['ID', 'NAME', 'CODE'],
            'filter' => ['=ACTIVE' => 'Y'],
            'limit' => $limit + 1,  // +1 для проверки next
            'offset' => ($page - 1) * $limit,
        ])->fetchAll();

        $hasNext = count($items) > $limit;
        if ($hasNext) {
            array_pop($items);
        }

        return [
            'result' => $items,
            'next' => $hasNext ? $page * $limit : null,
            'total' => ItemTable::getCount(['=ACTIVE' => 'Y']),
        ];
    }

    public static function itemGet(array $query, int $n, \CRestServer $server): array
    {
        Loader::requireModule('vendor.modulename');

        $id = (int)($query['id'] ?? 0);
        if ($id <= 0) {
            throw new \Bitrix\Rest\RestException(
                'Parameter "id" is required',
                'INVALID_PARAMS',
                \CRestServer::STATUS_WRONG_REQUEST
            );
        }

        $item = ItemTable::getById($id)->fetch();
        if (!$item) {
            throw new \Bitrix\Rest\RestException(
                'Item not found',
                'NOT_FOUND',
                \CRestServer::STATUS_NOT_FOUND
            );
        }

        return $item;
    }

    public static function itemAdd(array $query, int $n, \CRestServer $server): array
    {
        Loader::requireModule('vendor.modulename');

        $fields = $query['fields'] ?? [];
        $result = ItemTable::add($fields);

        if (!$result->isSuccess()) {
            throw new \Bitrix\Rest\RestException(
                implode(', ', $result->getErrorMessages()),
                'ADD_ERROR',
                \CRestServer::STATUS_WRONG_REQUEST
            );
        }

        return ['id' => $result->getId()];
    }
}
```

### 3. Регистрация REST-обработчиков

В `init.php` или через модуль:

```php
use Bitrix\Main\EventManager;

$eventManager = EventManager::getInstance();
$eventManager->addEventHandlerCompatible(
    'rest',
    'OnRestServiceBuildDescription',
    'Vendor\\ModuleName\\RestHandler',
    'onRestServiceBuildDescription'
);
```

## ActionFilter — фильтры для контроллеров

| Фильтр | Назначение |
|--------|-----------|
| `Authentication` | Требует авторизацию |
| `HttpMethod` | Ограничивает HTTP-метод (GET, POST, etc.) |
| `Csrf` | Проверка CSRF-токена |
| `ContentType` | Ограничение Content-Type |
| `Scope` | Проверка scope для REST |
| `CloseSession` | Закрывает сессию (для производительности) |

## Best Practices

1. **Используй контроллеры D7** для внутреннего API
2. **Используй модуль REST** для внешних интеграций через OAuth
3. **Валидируй входные данные** — не доверяй параметрам
4. **Пагинация** — всегда ограничивай выборку, поддерживай `next`
5. **Обрабатывай ошибки** — возвращай понятные коды и сообщения
6. **Логируй** — записывай ошибки API для отладки

Для полной справки по placement, scope и OAuth смотри [reference.md](reference.md).
