# Bitrix REST API — Полная справка

## Placement API (встраивание интерфейса)

Placement позволяет встраивать свой UI в стандартные интерфейсы Bitrix24.

### Регистрация placement

```php
// Через REST-событие
public static function onRestServiceBuildDescription(): array
{
    return [
        'vendor.modulename' => [
            'vendor.modulename.item.list' => [...],

            // Регистрация placement
            \CRestUtil::PLACEMENTS => [
                // Встраивание в карточку CRM
                \Bitrix\Crm\Integration\Rest\AppPlacement::CARD_WIDGET => [
                    'callback' => [static::class, 'onCrmCardWidget'],
                ],
                // Кастомный placement
                'VENDOR_CUSTOM_PLACEMENT' => [],
            ],
        ],
    ];
}
```

### Стандартные placement-точки

| Placement | Где |
|-----------|-----|
| `CRM_DEAL_LIST_MENU` | Меню списка сделок |
| `CRM_DEAL_DETAIL_TAB` | Вкладка в карточке сделки |
| `CRM_CONTACT_DETAIL_TAB` | Вкладка в карточке контакта |
| `CRM_LEAD_DETAIL_TAB` | Вкладка в карточке лида |
| `TASK_VIEW_TAB` | Вкладка в задаче |
| `USER_PROFILE_MENU` | Меню профиля |
| `PAGE_BACKGROUND_WORKER` | Фоновый воркер (невидимый iframe) |

## OAuth-авторизация

### Для серверных приложений

```php
// Получение access_token
$authUrl = 'https://oauth.bitrix.info/oauth/authorize/';
$params = [
    'client_id' => $clientId,
    'response_type' => 'code',
    'redirect_uri' => $redirectUri,
];

// После получения code — обмен на token
$tokenUrl = 'https://oauth.bitrix.info/oauth/token/';
$tokenParams = [
    'grant_type' => 'authorization_code',
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'code' => $authCode,
];
```

### Обновление токена

```php
$refreshParams = [
    'grant_type' => 'refresh_token',
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'refresh_token' => $refreshToken,
];
```

## Scope (области доступа)

| Scope | Доступ |
|-------|--------|
| `crm` | CRM (сделки, лиды, контакты, компании) |
| `task` | Задачи |
| `user` | Пользователи |
| `department` | Структура |
| `calendar` | Календарь |
| `disk` | Диск |
| `entity` | Хранилище данных |
| `im` | Мессенджер |
| `log` | Живая лента |
| `lists` | Списки (универсальные) |
| `sonet_group` | Рабочие группы |
| `telephony` | Телефония |
| `landing` | Сайты |
| `userfieldtype` | Типы пользовательских полей |

## Batch-запросы

```javascript
// JS SDK — пакетные запросы
BX24.callBatch([
    ['vendor.modulename.item.get', { id: 1 }],
    ['vendor.modulename.item.get', { id: 2 }],
    ['vendor.modulename.item.get', { id: 3 }],
], function(results) {
    console.log(results);
});

// С зависимостями
BX24.callBatch({
    'create': ['vendor.modulename.item.add', { fields: { NAME: 'Test' } }],
    'get': ['vendor.modulename.item.get', { id: '$result[create][id]' }],
}, function(results) {
    console.log(results);
}, true); // halt on error
```

## Вебхуки (Webhooks)

Входящий вебхук позволяет вызывать REST без OAuth:

```
https://your-domain.bitrix24.ru/rest/1/abc123xyz/crm.deal.list
```

Формат: `https://{domain}/rest/{user_id}/{webhook_token}/{method}`

### Вызов через PHP

```php
$webhookUrl = 'https://domain.bitrix24.ru/rest/1/abc123xyz/';

$response = file_get_contents($webhookUrl . 'crm.deal.list?' . http_build_query([
    'filter' => ['STAGE_ID' => 'WON'],
    'select' => ['ID', 'TITLE', 'OPPORTUNITY'],
]));

$data = json_decode($response, true);
```

## Пагинация в REST

### Стандартная пагинация

REST API Bitrix24 использует `start` + `next`:

```php
public static function itemList(array $query, int $n, \CRestServer $server): array
{
    $start = (int)($query['start'] ?? 0);
    $limit = 50; // Максимум 50 записей за запрос

    $items = ItemTable::getList([
        'select' => ['ID', 'NAME'],
        'limit' => $limit,
        'offset' => $start,
        'count_total' => true,
    ]);

    $result = $items->fetchAll();
    $total = $items->getCount();

    $response = ['result' => $result, 'total' => $total];

    if ($start + $limit < $total) {
        $response['next'] = $start + $limit;
    }

    return $response;
}
```

## Обработка ошибок в REST

```php
use Bitrix\Rest\RestException;

// Стандартные статусы
throw new RestException(
    'Item not found',           // Сообщение
    'NOT_FOUND',                // Код ошибки
    \CRestServer::STATUS_NOT_FOUND  // HTTP-статус
);

// Доступные статусы
\CRestServer::STATUS_OK              // 200
\CRestServer::STATUS_WRONG_REQUEST   // 400
\CRestServer::STATUS_UNAUTHORIZED    // 401
\CRestServer::STATUS_FORBIDDEN       // 403
\CRestServer::STATUS_NOT_FOUND       // 404
\CRestServer::STATUS_INTERNAL        // 500
```

## D7 Router REST endpoints

```php
// local/routes/api.php
use Bitrix\Main\Routing\RoutingConfigurator;

return function (RoutingConfigurator $routes) {
    $routes->prefix('api/v1')->group(function (RoutingConfigurator $routes) {

        $routes->get('/items/', [
            \Vendor\ModuleName\Controller\Item::class, 'list'
        ]);

        $routes->get('/items/{id}/', [
            \Vendor\ModuleName\Controller\Item::class, 'get'
        ])->where('id', '[0-9]+');

        $routes->post('/items/', [
            \Vendor\ModuleName\Controller\Item::class, 'create'
        ]);

        $routes->put('/items/{id}/', [
            \Vendor\ModuleName\Controller\Item::class, 'update'
        ])->where('id', '[0-9]+');

        $routes->delete('/items/{id}/', [
            \Vendor\ModuleName\Controller\Item::class, 'delete'
        ])->where('id', '[0-9]+');
    });
};
```
