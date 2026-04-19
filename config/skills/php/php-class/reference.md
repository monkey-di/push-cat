# PHP 8+ Classes — Полная справка

## Constructor Promotion

```php
// PHP 8.0+ — свойства объявляются прямо в конструкторе
class Order
{
    public function __construct(
        private readonly int $id,
        private readonly string $customerName,
        private float $total = 0.0,
        private Status $status = Status::Draft,
    ) {}
}

// Эквивалент без promotion:
class Order
{
    private readonly int $id;
    private readonly string $customerName;
    private float $total;
    private Status $status;

    public function __construct(int $id, string $customerName, float $total = 0.0, Status $status = Status::Draft)
    {
        $this->id = $id;
        $this->customerName = $customerName;
        $this->total = $total;
        $this->status = $status;
    }
}
```

## Readonly

### Readonly свойства (PHP 8.1)

```php
class Config
{
    public function __construct(
        public readonly string $host,
        public readonly int $port,
        public readonly bool $ssl = true,
    ) {}
}

$config = new Config('localhost', 5432);
$config->host = 'other'; // Fatal error: Cannot modify readonly property
```

### Readonly классы (PHP 8.2)

```php
readonly class Coordinates
{
    public function __construct(
        public float $latitude,
        public float $longitude,
    ) {}

    public function distanceTo(self $other): float
    {
        // Все свойства автоматически readonly
        // Нельзя объявлять не-readonly свойства
    }
}
```

## Enums

### Pure Enum

```php
enum Direction
{
    case North;
    case South;
    case East;
    case West;

    public function opposite(): self
    {
        return match ($this) {
            self::North => self::South,
            self::South => self::North,
            self::East => self::West,
            self::West => self::East,
        };
    }
}
```

### Backed Enum (со значениями)

```php
enum Permission: string
{
    case Read = 'read';
    case Write = 'write';
    case Delete = 'delete';
    case Admin = 'admin';

    /**
     * @return array<self>
     */
    public function includes(): array
    {
        return match ($this) {
            self::Admin => [self::Read, self::Write, self::Delete],
            self::Delete => [self::Read, self::Write],
            self::Write => [self::Read],
            self::Read => [],
        };
    }

    public function can(self $permission): bool
    {
        return $this === $permission || in_array($permission, $this->includes(), true);
    }
}

// Использование
$perm = Permission::from('write');        // Permission::Write
$perm = Permission::tryFrom('invalid');   // null
Permission::cases();                       // все варианты
```

### Enum с интерфейсом

```php
interface HasLabel
{
    public function label(): string;
}

enum OrderStatus: string implements HasLabel
{
    case New = 'new';
    case Processing = 'processing';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::New => 'Новый',
            self::Processing => 'В обработке',
            self::Completed => 'Завершён',
            self::Cancelled => 'Отменён',
        };
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Completed, self::Cancelled], true);
    }
}
```

## Type System

### Union Types (PHP 8.0)

```php
function parse(string|int $value): string { ... }
function findUser(int $id): User|null { ... }  // = ?User
```

### Intersection Types (PHP 8.1)

```php
function process(Countable&Iterator $collection): int
{
    // $collection гарантированно реализует ОБА интерфейса
    foreach ($collection as $item) { ... }
    return count($collection);
}
```

### DNF Types (PHP 8.2)

```php
function handle((Renderable&Stringable)|string $value): string
{
    if (is_string($value)) {
        return $value;
    }
    return (string)$value;
}
```

### Standalone null, true, false (PHP 8.2)

```php
function validate(): true { return true; }          // всегда true
function checkAccess(): true|never { ... }          // true или бросает исключение
```

## Interfaces

```php
interface UserRepositoryInterface
{
    public function findById(int $id): ?User;

    public function findByEmail(string $email): ?User;

    /**
     * @return array<User>
     */
    public function findAll(int $limit = 100, int $offset = 0): array;

    public function save(User $user): void;

    public function delete(int $id): void;
}
```

## Abstract Classes

```php
abstract class AbstractRepository
{
    public function __construct(
        protected readonly \PDO $pdo,
    ) {}

    abstract protected function getTableName(): string;

    abstract protected function hydrate(array $row): object;

    public function findById(int $id): ?object
    {
        $stmt = $this->pdo->prepare(
            sprintf('SELECT * FROM %s WHERE id = :id', $this->getTableName())
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? $this->hydrate($row) : null;
    }
}
```

## Traits

```php
trait Timestampable
{
    private ?\DateTimeImmutable $createdAt = null;
    private ?\DateTimeImmutable $updatedAt = null;

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): void
    {
        $this->createdAt = $createdAt;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function markUpdated(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}

class Article
{
    use Timestampable;

    public function __construct(
        private readonly int $id,
        private string $title,
    ) {
        $this->setCreatedAt(new \DateTimeImmutable());
    }
}
```

## Attributes

### Создание атрибута

```php
#[\Attribute(\Attribute::TARGET_PROPERTY)]
class Validate
{
    public function __construct(
        public readonly string $rule,
        public readonly ?string $message = null,
    ) {}
}

#[\Attribute(\Attribute::TARGET_PROPERTY | \Attribute::IS_REPEATABLE)]
class Assert
{
    public function __construct(
        public readonly string $type,
        public readonly mixed $value = null,
        public readonly ?string $message = null,
    ) {}
}
```

### Использование атрибутов

```php
class CreateUserRequest
{
    public function __construct(
        #[Assert('notBlank', message: 'Name is required')]
        #[Assert('length', ['min' => 2, 'max' => 100])]
        public readonly string $name,

        #[Assert('notBlank')]
        #[Assert('email')]
        public readonly string $email,

        #[Assert('range', ['min' => 18, 'max' => 150])]
        public readonly ?int $age = null,
    ) {}
}
```

### Чтение атрибутов через Reflection

```php
function validateObject(object $object): array
{
    $errors = [];
    $reflection = new \ReflectionClass($object);

    foreach ($reflection->getProperties() as $property) {
        $attributes = $property->getAttributes(Assert::class);

        foreach ($attributes as $attribute) {
            $assert = $attribute->newInstance();
            $value = $property->getValue($object);

            if (!validate($assert->type, $value, $assert->value)) {
                $errors[$property->getName()][] = $assert->message ?? "Validation failed: {$assert->type}";
            }
        }
    }

    return $errors;
}
```

## Property Hooks (PHP 8.4)

```php
class Temperature
{
    public float $celsius {
        get => $this->celsius;
        set (float $value) {
            if ($value < -273.15) {
                throw new \InvalidArgumentException('Below absolute zero');
            }
            $this->celsius = $value;
        }
    }

    public float $fahrenheit {
        get => $this->celsius * 9 / 5 + 32;
        set (float $value) {
            $this->celsius = ($value - 32) * 5 / 9;
        }
    }

    public function __construct(float $celsius)
    {
        $this->celsius = $celsius;
    }
}
```

## Asymmetric Visibility (PHP 8.4)

```php
class UserProfile
{
    public function __construct(
        public private(set) string $name,        // read: public, write: private
        public protected(set) string $email,     // read: public, write: protected
        public private(set) int $loginCount = 0, // read: public, write: private
    ) {}

    public function incrementLoginCount(): void
    {
        $this->loginCount++;  // OK — внутри класса
    }
}

$profile = new UserProfile('John', 'john@example.com');
echo $profile->name;            // OK
$profile->name = 'Jane';        // Error
$profile->incrementLoginCount(); // OK
```

## SOLID в PHP 8+

### S — Single Responsibility

```php
// Плохо: класс делает и бизнес-логику, и отправку почты, и логирование
// Хорошо: разделяем
final class OrderProcessor
{
    public function __construct(
        private readonly OrderRepository $repository,
        private readonly PaymentGateway $payment,
        private readonly EventDispatcherInterface $events,
    ) {}

    public function process(Order $order): void
    {
        $this->payment->charge($order->total());
        $this->repository->save($order);
        $this->events->dispatch(new OrderProcessed($order));
    }
}
```

### O — Open/Closed (через interface + strategy)

```php
interface DiscountStrategy
{
    public function calculate(Order $order): float;
}

final class PercentageDiscount implements DiscountStrategy { ... }
final class FixedDiscount implements DiscountStrategy { ... }
final class VolumeDiscount implements DiscountStrategy { ... }
```

### L — Liskov Substitution

```php
// Подклассы должны быть взаимозаменяемы с родителем
// Используй #[\Override] для явности
```

### I — Interface Segregation

```php
// Плохо: один толстый интерфейс
// Хорошо: маленькие интерфейсы
interface Readable { public function read(int $id): ?Entity; }
interface Writable { public function save(Entity $entity): void; }
interface Deletable { public function delete(int $id): void; }
```

### D — Dependency Inversion

```php
// Зависимость от абстракции (interface), не от реализации
final class UserService
{
    public function __construct(
        private readonly UserRepositoryInterface $repository, // не UserRepository
        private readonly LoggerInterface $logger,             // не FileLogger
    ) {}
}
```

## Generics (PHPStan/Psalm)

PHP не имеет встроенных generics, но статические анализаторы поддерживают их через PHPDoc:

```php
/**
 * @template T of object
 */
interface RepositoryInterface
{
    /**
     * @param int $id
     * @return T|null
     */
    public function findById(int $id): ?object;

    /**
     * @param T $entity
     */
    public function save(object $entity): void;

    /**
     * @return array<T>
     */
    public function findAll(): array;
}

/**
 * @implements RepositoryInterface<User>
 */
final class UserRepository implements RepositoryInterface
{
    public function findById(int $id): ?User { ... }
    public function save(object $entity): void { ... }
    public function findAll(): array { ... }
}
```

### Коллекции с generics

```php
/**
 * @template T
 * @implements \IteratorAggregate<int, T>
 */
final class TypedCollection implements \IteratorAggregate, \Countable
{
    /** @var array<int, T> */
    private array $items = [];

    /**
     * @param T $item
     */
    public function add(object $item): void
    {
        $this->items[] = $item;
    }

    /**
     * @return T|null
     */
    public function first(): ?object
    {
        return $this->items[0] ?? null;
    }

    public function count(): int
    {
        return count($this->items);
    }

    /**
     * @return \ArrayIterator<int, T>
     */
    public function getIterator(): \ArrayIterator
    {
        return new \ArrayIterator($this->items);
    }
}
```
