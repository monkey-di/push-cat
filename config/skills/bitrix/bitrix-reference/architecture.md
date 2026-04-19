# Архитектура Bitrix D7

## Ядро (Main module)

Модуль `main` — основа всего. Ключевые подсистемы:

### Application (Singleton)

```php
use Bitrix\Main\Application;

$app = Application::getInstance();

// Доступ к подсистемам
$connection = $app->getConnection();           // DB connection
$cache = $app->getManagedCache();              // Managed cache
$request = $app->getContext()->getRequest();   // HTTP request
$response = $app->getContext()->getResponse(); // HTTP response
```

### Service Locator (DI-контейнер)

```php
use Bitrix\Main\DI\ServiceLocator;

// Регистрация сервиса (в .settings.php или .settings_extra.php)
// 'services' => [
//     'value' => [
//         'my.service' => [
//             'className' => '\Vendor\Module\MyService',
//         ],
//     ],
// ],

$service = ServiceLocator::getInstance()->get('my.service');
```

### Конфигурация (.settings.php)

```php
// /bitrix/.settings.php — основная
// /bitrix/.settings_extra.php — переопределения (не трогать .settings.php)

return [
    'connections' => [
        'value' => [
            'default' => [
                'className' => \Bitrix\Main\DB\MysqliConnection::class,
                'host' => 'localhost',
                'database' => 'db_name',
                'login' => 'user',
                'password' => 'pass',
            ],
        ],
    ],
    'services' => [
        'value' => [
            // Регистрация сервисов DI
        ],
    ],
    'cache' => [
        'value' => [
            'type' => ['class_name' => 'CPHPCacheMemcache'],
        ],
    ],
];
```

## Модульная архитектура

Каждый модуль — изолированный пакет с собственными:
- ORM-сущностями (`lib/`)
- Событиями
- REST-методами
- Агентами
- Компонентами
- Административными страницами

### Автозагрузка классов модуля

Класс `Vendor\Module\SubDir\ClassName` → файл `local/modules/vendor.module/lib/subdir/classname.php`

Правила:
- Namespace `Vendor\Module` → каталог `vendor.module/lib/`
- Подкаталоги в нижнем регистре
- Имя файла = имя класса в нижнем регистре + `.php`

## Слои D7

```
┌────────────────────────────────────────┐
│            Компоненты / REST           │  ← Presentation layer
├────────────────────────────────────────┤
│          Сервисы / Бизнес-логика       │  ← Business layer
├────────────────────────────────────────┤
│       ORM (DataManager / Entity)       │  ← Data Access layer
├────────────────────────────────────────┤
│    DB Connection / SQL / Cache         │  ← Infrastructure
└────────────────────────────────────────┘
```

## Жизненный цикл запроса

1. `/bitrix/php_interface/dbconn.php` — параметры подключения
2. `/bitrix/.settings.php` — конфигурация
3. `Application::getInstance()` — инициализация
4. `/local/php_interface/init.php` — кастомный код (события, функции)
5. Маршрутизация (urlrewrite.php или роутер D7)
6. Подключение компонентов страницы
7. Шаблон сайта (header/footer)

## Маршрутизация D7 (Router)

```php
use Bitrix\Main\Routing\RoutingConfigurator;

return function (RoutingConfigurator $routes) {
    $routes->get('/api/items/', function () {
        // ...
    });

    $routes->post('/api/items/', function () {
        // ...
    });

    $routes->prefix('api')->group(function (RoutingConfigurator $routes) {
        $routes->get('/users/{id}/', [\Vendor\Module\Controller\UserController::class, 'get']);
    });
};
```

Файл маршрутов: `/local/routes/web.php` или регистрация через модуль.

## Контроллеры D7

```php
namespace Vendor\Module\Controller;

use Bitrix\Main\Engine\Controller;
use Bitrix\Main\Engine\ActionFilter;

class ItemController extends Controller
{
    public function configureActions(): array
    {
        return [
            'list' => [
                'prefilters' => [
                    new ActionFilter\Authentication(),
                    new ActionFilter\HttpMethod([ActionFilter\HttpMethod::METHOD_GET]),
                ],
            ],
        ];
    }

    public function listAction(int $page = 1): array
    {
        // Бизнес-логика
        return ['items' => []];
    }
}
```
