# PSR-стандарты — Справка

## PSR-1: Basic Coding Standard

- Файлы **должны** использовать только `<?php` и `<?=`
- Файлы **должны** быть в UTF-8 без BOM
- Один файл = один символ (class/interface/trait/enum) **или** side-effects, но не оба
- Namespace и классы следуют PSR-4
- Константы — `UPPER_SNAKE_CASE`
- Методы — `camelCase()`

## PSR-4: Autoloading

Маппинг namespace → каталог:

```json
// composer.json
{
    "autoload": {
        "psr-4": {
            "App\\": "src/",
            "App\\Tests\\": "tests/"
        }
    }
}
```

| Класс | Файл |
|-------|------|
| `App\Service\UserService` | `src/Service/UserService.php` |
| `App\Entity\User` | `src/Entity/User.php` |
| `App\Tests\Service\UserServiceTest` | `tests/Service/UserServiceTest.php` |

Правила:
- Namespace prefix маппится на base directory
- Subdirectory = sub-namespace
- Имя файла = имя класса + `.php`
- Регистрозависимо

## PSR-3: Logger Interface

```php
use Psr\Log\LoggerInterface;

class UserService
{
    public function __construct(
        private readonly LoggerInterface $logger,
    ) {}

    public function deleteUser(int $id): void
    {
        $this->logger->info('Deleting user', ['id' => $id]);

        try {
            // ...
            $this->logger->notice('User deleted', ['id' => $id]);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to delete user', [
                'id' => $id,
                'exception' => $e,
            ]);
            throw $e;
        }
    }
}
```

### Уровни логирования

| Уровень | Когда использовать |
|---------|-------------------|
| `emergency` | Система неработоспособна |
| `alert` | Требуется немедленное действие |
| `critical` | Критические условия (потеря данных, недоступность компонента) |
| `error` | Ошибки, не требующие немедленного действия |
| `warning` | Нештатные ситуации, не ошибки |
| `notice` | Нормальные, но значимые события |
| `info` | Информационные сообщения |
| `debug` | Детальная отладочная информация |

## PSR-7: HTTP Message Interface

```php
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;

function handleRequest(ServerRequestInterface $request): ResponseInterface
{
    $method = $request->getMethod();                    // GET, POST, ...
    $uri = $request->getUri();                          // UriInterface
    $headers = $request->getHeaders();                  // array
    $body = $request->getBody();                        // StreamInterface
    $queryParams = $request->getQueryParams();          // array
    $parsedBody = $request->getParsedBody();            // array|object|null
    $attributes = $request->getAttributes();            // array (router params)

    // Объекты immutable — все модификации возвращают новый объект
    $newRequest = $request->withAttribute('userId', 42);
}
```

### Ключевые интерфейсы

| Интерфейс | Назначение |
|-----------|-----------|
| `MessageInterface` | Базовый HTTP-сообщение |
| `RequestInterface` | Исходящий запрос |
| `ServerRequestInterface` | Входящий запрос сервера |
| `ResponseInterface` | HTTP-ответ |
| `StreamInterface` | Тело сообщения (поток) |
| `UriInterface` | URI |
| `UploadedFileInterface` | Загруженный файл |

## PSR-11: Container Interface

```php
use Psr\Container\ContainerInterface;

class ServiceFactory
{
    public function __construct(
        private readonly ContainerInterface $container,
    ) {}

    public function createHandler(): RequestHandler
    {
        // has() — проверка наличия
        if ($this->container->has(LoggerInterface::class)) {
            $logger = $this->container->get(LoggerInterface::class);
        }

        return new RequestHandler($logger ?? new NullLogger());
    }
}
```

## PSR-12: Extended Coding Style (PER Coding Style 2.0)

### Файлы

```php
<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Psr\Log\LoggerInterface;

// Одна пустая строка между секциями use
use function array_map;

use const PHP_EOL;
```

### Классы

```php
class UserService extends AbstractService implements
    UserServiceInterface,
    LoggableInterface
{
    // Открывающая скобка класса — на новой строке
    // Закрывающая — на отдельной строке
}
```

### Методы

```php
public function createUser(
    string $name,
    string $email,
    ?int $age = null,
): User {
    // Открывающая скобка метода — на новой строке? Нет: на той же строке
    // Список параметров: если не помещается в одну строку — по одному на строку
    // Trailing comma в параметрах — да (PHP 8.0+)
}
```

### Управляющие конструкции

```php
// if — скобки на той же строке
if ($condition) {
    // ...
} elseif ($other) {    // не "else if"
    // ...
} else {
    // ...
}

// switch
switch ($value) {
    case 1:
        // ...
        break;
    case 2:
        // ...
        // no break — комментарий обязателен если fall-through
    default:
        // ...
        break;
}

// try-catch
try {
    // ...
} catch (FirstException | SecondException $e) {
    // ...
} finally {
    // ...
}
```

### Closures

```php
$closure = function (int $x, int $y) use ($multiplier): int {
    return ($x + $y) * $multiplier;
};

$arrowFn = fn(int $x): int => $x * 2;
```

### Ключевые правила

- Отступ: **4 пробела** (не табы)
- Длина строки: soft limit **120 символов**
- Пустая строка после `namespace`, между `use` блоками
- `true`, `false`, `null` — **в нижнем регистре**
- Пробел **после** ключевых слов (`if`, `for`, `while`, `switch`, `catch`)
- **Без** пробела после имени функции/метода перед скобкой

## PSR-15: HTTP Server Request Handlers & Middleware

### Handler

```php
use Psr\Http\Server\RequestHandlerInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;

class UserController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $userId = $request->getAttribute('userId');
        // ...
        return new JsonResponse(['user' => $userData]);
    }
}
```

### Middleware

```php
use Psr\Http\Server\MiddlewareInterface;

class AuthMiddleware implements MiddlewareInterface
{
    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler,
    ): ResponseInterface {
        $token = $request->getHeaderLine('Authorization');

        if (!$this->isValidToken($token)) {
            return new JsonResponse(['error' => 'Unauthorized'], 401);
        }

        $userId = $this->extractUserId($token);
        $request = $request->withAttribute('userId', $userId);

        return $handler->handle($request);
    }
}
```

### Pipeline (порядок выполнения)

```
Request → [Middleware1] → [Middleware2] → [Handler] → Response
            ↑                                 ↓
            └─────────── Response ←───────────┘
```

```php
// Типичный стек middleware
$pipeline = [
    ErrorHandlerMiddleware::class,     // 1. Обработка ошибок (оборачивает всё)
    CorsMiddleware::class,             // 2. CORS
    AuthMiddleware::class,             // 3. Авторизация
    RateLimitMiddleware::class,        // 4. Rate limiting
    RoutingMiddleware::class,          // 5. Роутинг
    // ... Handler
];
```
