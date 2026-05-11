# PHP 8.0–8.4 — Обзор фич по версиям

## PHP 8.0

### Named Arguments

```php
// Позволяет передавать аргументы по имени, пропуская дефолтные
htmlspecialchars($string, double_encode: false);

array_slice($array, offset: 2, length: 5, preserve_keys: true);
```

### Match Expression

```php
$result = match ($status) {
    'active', 'published' => 'visible',
    'draft' => 'hidden',
    'archived' => 'removed',
    default => throw new \InvalidArgumentException("Unknown status: $status"),
};
// match использует strict comparison (===), не switch-like (==)
```

### Nullsafe Operator

```php
// Вместо:
$country = null;
if ($user !== null) {
    $address = $user->getAddress();
    if ($address !== null) {
        $country = $address->getCountry();
    }
}

// PHP 8.0:
$country = $user?->getAddress()?->getCountry();
```

### Union Types

```php
function process(string|int $value): string|false { ... }
```

### Constructor Promotion

```php
class User
{
    public function __construct(
        private readonly string $name,
        private readonly string $email,
        private int $age = 0,
    ) {}
}
```

### Attributes

```php
#[Route('/api/users', methods: ['GET'])]
public function listUsers(): Response { ... }

#[Deprecated('Use newMethod() instead')]
public function oldMethod(): void { ... }

// Чтение атрибутов
$reflector = new ReflectionMethod(Controller::class, 'listUsers');
$attributes = $reflector->getAttributes(Route::class);
```

### Создание кастомного атрибута

```php
#[\Attribute(\Attribute::TARGET_METHOD | \Attribute::IS_REPEATABLE)]
class Route
{
    public function __construct(
        public readonly string $path,
        public readonly array $methods = ['GET'],
    ) {}
}
```

### str_contains, str_starts_with, str_ends_with

```php
str_contains('Hello World', 'World');     // true
str_starts_with('Hello World', 'Hello');  // true
str_ends_with('Hello World', 'World');    // true
```

### throw как выражение

```php
$value = $array['key'] ?? throw new \InvalidArgumentException('Missing key');

$fn = fn() => throw new \LogicException('Not implemented');
```

## PHP 8.1

### Enums

```php
// Чистый enum (без значений)
enum Status
{
    case Active;
    case Inactive;
    case Archived;
}

// Backed enum (со значениями)
enum Color: string
{
    case Red = 'red';
    case Green = 'green';
    case Blue = 'blue';

    // Методы в enum
    public function label(): string
    {
        return match ($this) {
            self::Red => 'Красный',
            self::Green => 'Зелёный',
            self::Blue => 'Синий',
        };
    }
}

// Использование
$color = Color::Red;
$color->value;            // 'red'
Color::from('green');     // Color::Green
Color::tryFrom('invalid'); // null
Color::cases();           // [Color::Red, Color::Green, Color::Blue]
```

### Readonly Properties

```php
class User
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
    ) {}
}

$user = new User(1, 'John');
$user->name = 'Jane'; // Error: Cannot modify readonly property
```

### Fibers

```php
$fiber = new Fiber(function (): void {
    $value = Fiber::suspend('hello');
    echo "Got: $value\n";
});

$result = $fiber->start();  // 'hello'
$fiber->resume('world');    // Got: world
```

### Intersection Types

```php
function process(Countable&Iterator $collection): void { ... }
```

### Never Type

```php
function redirect(string $url): never
{
    header("Location: $url");
    exit;
}
```

### First-class Callable Syntax

```php
$fn = strlen(...);          // Closure из функции
$fn = $obj->method(...);   // Closure из метода
$fn = Foo::staticMethod(...); // Closure из статического метода

$lengths = array_map(strlen(...), ['hello', 'world']);
```

### array_is_list

```php
array_is_list([1, 2, 3]);         // true
array_is_list(['a' => 1, 'b' => 2]); // false
array_is_list([0 => 'a', 1 => 'b']); // true
```

## PHP 8.2

### Readonly Classes

```php
readonly class UserDTO
{
    public function __construct(
        public string $name,
        public string $email,
        public int $age,
    ) {}
}
// Все свойства автоматически readonly
```

### DNF Types (Disjunctive Normal Form)

```php
function process((Countable&Iterator)|null $collection): void { ... }
// Intersection + Union: (A&B)|C
```

### true, false, null как standalone типы

```php
function alwaysTrue(): true { return true; }
function alwaysFalse(): false { return false; }
function alwaysNull(): null { return null; }
```

### Constants in Traits

```php
trait HasVersion
{
    public const VERSION = '1.0.0';
}
```

### #[\SensitiveParameter]

```php
function authenticate(
    string $username,
    #[\SensitiveParameter] string $password,
): bool {
    // В stack trace пароль будет скрыт
}
```

## PHP 8.3

### Typed Class Constants

```php
class Config
{
    public const string APP_NAME = 'MyApp';
    public const int MAX_RETRIES = 3;
    public const array ALLOWED_TYPES = ['jpg', 'png'];
}

interface HasVersion
{
    public const string VERSION = '1.0.0';
}
```

### json_validate()

```php
if (json_validate($jsonString)) {
    $data = json_decode($jsonString, true);
}
```

### #[\Override]

```php
class Parent
{
    public function process(): void { ... }
}

class Child extends Parent
{
    #[\Override]
    public function process(): void { ... } // OK

    #[\Override]
    public function procsess(): void { ... } // Error! Нет такого метода в родителе
}
```

### Dynamic class constant fetch

```php
$constName = 'MAX_RETRIES';
$value = Config::{$constName}; // Config::MAX_RETRIES
```

### Улучшенные DateTime

```php
$period = new DatePeriod(
    new DateTime('2024-01-01'),
    new DateInterval('P1D'),
    new DateTime('2024-01-31'),
);
// DatePeriod теперь implements IteratorAggregate
```

## PHP 8.4

### Property Hooks

```php
class User
{
    public string $fullName {
        get => "$this->firstName $this->lastName";
        set (string $value) {
            [$this->firstName, $this->lastName] = explode(' ', $value, 2);
        }
    }

    public function __construct(
        private string $firstName,
        private string $lastName,
    ) {}
}
```

### Asymmetric Visibility

```php
class User
{
    public function __construct(
        public private(set) string $name,    // read: public, write: private
        public protected(set) int $age,      // read: public, write: protected
    ) {}
}

$user = new User('John', 30);
echo $user->name;     // OK
$user->name = 'Jane'; // Error: Cannot modify from outside
```

### new MyClass()->method() без скобок

```php
// PHP 8.4 — можно без оборачивания в скобки
$name = new User('John')->getName();

// До 8.4 нужно было:
$name = (new User('John'))->getName();
```

### array_find, array_find_key, array_any, array_all

```php
$users = [['name' => 'John', 'active' => true], ['name' => 'Jane', 'active' => false]];

$first = array_find($users, fn($u) => $u['active']); // ['name' => 'John', ...]
$key = array_find_key($users, fn($u) => $u['active']); // 0
$any = array_any($users, fn($u) => $u['active']);   // true
$all = array_all($users, fn($u) => $u['active']);   // false
```

### Multibyte trim functions

```php
mb_trim($string);
mb_ltrim($string);
mb_rtrim($string);
```
