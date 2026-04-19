# Design Patterns в PHP 8+ — Полная справка

## Repository

```php
// Интерфейс
interface UserRepositoryInterface
{
    public function findById(int $id): ?User;
    public function findByEmail(string $email): ?User;
    /** @return array<User> */
    public function findByRole(Role $role, int $limit = 50): array;
    public function save(User $user): void;
    public function delete(int $id): void;
}

// Реализация через PDO
final class PdoUserRepository implements UserRepositoryInterface
{
    public function __construct(
        private readonly \PDO $pdo,
    ) {}

    public function findById(int $id): ?User
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? $this->hydrate($row) : null;
    }

    public function save(User $user): void
    {
        if ($user->id === null) {
            $this->insert($user);
        } else {
            $this->update($user);
        }
    }

    private function hydrate(array $row): User
    {
        return new User(
            id: (int)$row['id'],
            name: $row['name'],
            email: $row['email'],
            role: Role::from($row['role']),
        );
    }
}
```

## Value Object

```php
// Immutable объект, идентифицируемый по значению, а не по ID
readonly class Money
{
    public function __construct(
        public int $amount,       // в минимальных единицах (копейки/центы)
        public Currency $currency,
    ) {
        if ($amount < 0) {
            throw new \InvalidArgumentException('Amount cannot be negative');
        }
    }

    public function add(self $other): self
    {
        $this->ensureSameCurrency($other);
        return new self($this->amount + $other->amount, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->ensureSameCurrency($other);
        if ($other->amount > $this->amount) {
            throw new \DomainException('Insufficient funds');
        }
        return new self($this->amount - $other->amount, $this->currency);
    }

    public function multiply(int $factor): self
    {
        return new self($this->amount * $factor, $this->currency);
    }

    public function equals(self $other): bool
    {
        return $this->amount === $other->amount
            && $this->currency === $other->currency;
    }

    public function format(): string
    {
        return number_format($this->amount / 100, 2, '.', ' ')
            . ' ' . $this->currency->value;
    }

    private function ensureSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException('Cannot operate on different currencies');
        }
    }
}

enum Currency: string
{
    case RUB = 'RUB';
    case USD = 'USD';
    case EUR = 'EUR';
}

// Email Value Object
readonly class Email
{
    public readonly string $value;

    public function __construct(string $email)
    {
        $normalized = mb_strtolower(trim($email));
        if (!filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException("Invalid email: $email");
        }
        $this->value = $normalized;
    }

    public function domain(): string
    {
        return substr($this->value, strpos($this->value, '@') + 1);
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
```

## DTO (Data Transfer Object)

```php
readonly class CreateUserDTO
{
    public function __construct(
        public string $name,
        public string $email,
        public ?int $age = null,
        public Role $role = Role::User,
    ) {}

    /**
     * @param array{name: string, email: string, age?: int, role?: string} $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'],
            email: $data['email'],
            age: $data['age'] ?? null,
            role: isset($data['role']) ? Role::from($data['role']) : Role::User,
        );
    }

    public static function fromRequest(ServerRequestInterface $request): self
    {
        $body = $request->getParsedBody();
        return self::fromArray($body);
    }
}
```

## Result / Either

```php
/**
 * @template T
 */
readonly class Result
{
    /** @var array<string> */
    private array $errors;

    /**
     * @param T|null $value
     * @param array<string> $errors
     */
    private function __construct(
        private mixed $value,
        array $errors,
        private bool $success,
    ) {
        $this->errors = $errors;
    }

    /**
     * @template V
     * @param V $value
     * @return self<V>
     */
    public static function success(mixed $value): self
    {
        return new self($value, [], true);
    }

    /**
     * @return self<null>
     */
    public static function failure(string ...$errors): self
    {
        return new self(null, $errors, false);
    }

    public function isSuccess(): bool
    {
        return $this->success;
    }

    public function isFailure(): bool
    {
        return !$this->success;
    }

    /**
     * @return T
     * @throws \LogicException
     */
    public function getValue(): mixed
    {
        if (!$this->success) {
            throw new \LogicException('Cannot get value from failed result');
        }
        return $this->value;
    }

    /** @return array<string> */
    public function getErrors(): array
    {
        return $this->errors;
    }

    /**
     * @template U
     * @param callable(T): U $fn
     * @return self<U>
     */
    public function map(callable $fn): self
    {
        if ($this->isFailure()) {
            return self::failure(...$this->errors);
        }
        return self::success($fn($this->value));
    }
}

// Использование
function createUser(CreateUserDTO $dto): Result
{
    if (empty($dto->name)) {
        return Result::failure('Name is required');
    }

    $user = new User($dto->name, $dto->email);
    return Result::success($user);
}

$result = createUser($dto);
if ($result->isSuccess()) {
    $user = $result->getValue();
} else {
    $errors = $result->getErrors();
}
```

## Strategy

```php
interface ShippingCalculator
{
    public function calculate(Order $order): Money;
    public function supports(Order $order): bool;
}

final class FlatRateShipping implements ShippingCalculator
{
    public function __construct(
        private readonly Money $rate,
    ) {}

    public function calculate(Order $order): Money
    {
        return $this->rate;
    }

    public function supports(Order $order): bool
    {
        return true; // фолбек-стратегия
    }
}

final class WeightBasedShipping implements ShippingCalculator
{
    public function __construct(
        private readonly Money $ratePerKg,
        private readonly float $maxWeight = 30.0,
    ) {}

    public function calculate(Order $order): Money
    {
        return $this->ratePerKg->multiply((int)ceil($order->totalWeight()));
    }

    public function supports(Order $order): bool
    {
        return $order->totalWeight() <= $this->maxWeight;
    }
}

final class FreeShipping implements ShippingCalculator
{
    public function __construct(
        private readonly Money $threshold,
    ) {}

    public function calculate(Order $order): Money
    {
        return new Money(0, $order->currency());
    }

    public function supports(Order $order): bool
    {
        return $order->total()->amount >= $this->threshold->amount;
    }
}

// Контекст — выбирает нужную стратегию
final class ShippingService
{
    /** @param array<ShippingCalculator> $calculators */
    public function __construct(
        private readonly array $calculators,
    ) {}

    public function calculateShipping(Order $order): Money
    {
        foreach ($this->calculators as $calculator) {
            if ($calculator->supports($order)) {
                return $calculator->calculate($order);
            }
        }
        throw new \RuntimeException('No shipping calculator available');
    }
}
```

## Builder

```php
final class QueryBuilder
{
    private string $table = '';
    /** @var array<string> */
    private array $select = ['*'];
    /** @var array<string> */
    private array $where = [];
    /** @var array<string, string> */
    private array $order = [];
    private ?int $limit = null;
    private int $offset = 0;
    /** @var array<string, mixed> */
    private array $params = [];

    public static function table(string $table): self
    {
        $builder = new self();
        $builder->table = $table;
        return $builder;
    }

    public function select(string ...$columns): self
    {
        $this->select = $columns;
        return $this;
    }

    public function where(string $condition, mixed $value = null): self
    {
        $paramName = 'p' . count($this->params);
        $this->where[] = str_replace('?', ":$paramName", $condition);
        if ($value !== null) {
            $this->params[$paramName] = $value;
        }
        return $this;
    }

    public function orderBy(string $column, string $direction = 'ASC'): self
    {
        $this->order[$column] = strtoupper($direction);
        return $this;
    }

    public function limit(int $limit, int $offset = 0): self
    {
        $this->limit = $limit;
        $this->offset = $offset;
        return $this;
    }

    public function toSQL(): string
    {
        $sql = 'SELECT ' . implode(', ', $this->select);
        $sql .= ' FROM ' . $this->table;

        if ($this->where) {
            $sql .= ' WHERE ' . implode(' AND ', $this->where);
        }
        if ($this->order) {
            $parts = array_map(fn($col, $dir) => "$col $dir", array_keys($this->order), $this->order);
            $sql .= ' ORDER BY ' . implode(', ', $parts);
        }
        if ($this->limit !== null) {
            $sql .= " LIMIT {$this->limit} OFFSET {$this->offset}";
        }

        return $sql;
    }

    /** @return array<string, mixed> */
    public function getParams(): array
    {
        return $this->params;
    }
}

// Использование
$query = QueryBuilder::table('users')
    ->select('id', 'name', 'email')
    ->where('active = ?', true)
    ->where('age > ?', 18)
    ->orderBy('name')
    ->limit(20);
```

## Specification

```php
interface Specification
{
    public function isSatisfiedBy(mixed $candidate): bool;
}

abstract class CompositeSpecification implements Specification
{
    public function and(Specification $other): self
    {
        return new AndSpecification($this, $other);
    }

    public function or(Specification $other): self
    {
        return new OrSpecification($this, $other);
    }

    public function not(): self
    {
        return new NotSpecification($this);
    }
}

final class AndSpecification extends CompositeSpecification
{
    public function __construct(
        private readonly Specification $left,
        private readonly Specification $right,
    ) {}

    public function isSatisfiedBy(mixed $candidate): bool
    {
        return $this->left->isSatisfiedBy($candidate)
            && $this->right->isSatisfiedBy($candidate);
    }
}

final class OrSpecification extends CompositeSpecification { /* аналогично с || */ }
final class NotSpecification extends CompositeSpecification { /* инверсия */ }

// Конкретные спецификации
final class IsActiveUser extends CompositeSpecification
{
    public function isSatisfiedBy(mixed $candidate): bool
    {
        return $candidate instanceof User && $candidate->isActive();
    }
}

final class HasMinimumAge extends CompositeSpecification
{
    public function __construct(private readonly int $minAge) {}

    public function isSatisfiedBy(mixed $candidate): bool
    {
        return $candidate instanceof User && $candidate->age >= $this->minAge;
    }
}

// Использование
$spec = (new IsActiveUser())->and(new HasMinimumAge(18));
$eligible = array_filter($users, $spec->isSatisfiedBy(...));
```

## Decorator

```php
interface Logger
{
    public function log(string $level, string $message, array $context = []): void;
}

final class FileLogger implements Logger
{
    public function __construct(private readonly string $filePath) {}

    public function log(string $level, string $message, array $context = []): void
    {
        $line = sprintf("[%s] %s: %s %s\n",
            date('Y-m-d H:i:s'), strtoupper($level), $message, json_encode($context));
        file_put_contents($this->filePath, $line, FILE_APPEND | LOCK_EX);
    }
}

// Декоратор — добавляет таймстамп и request ID
final class ContextEnrichingLogger implements Logger
{
    public function __construct(
        private readonly Logger $inner,
        private readonly string $requestId,
    ) {}

    public function log(string $level, string $message, array $context = []): void
    {
        $context['request_id'] = $this->requestId;
        $context['timestamp'] = microtime(true);
        $this->inner->log($level, $message, $context);
    }
}

// Декоратор — фильтрует по уровню
final class LevelFilteringLogger implements Logger
{
    private const LEVELS = ['debug' => 0, 'info' => 1, 'warning' => 2, 'error' => 3];

    public function __construct(
        private readonly Logger $inner,
        private readonly string $minLevel = 'info',
    ) {}

    public function log(string $level, string $message, array $context = []): void
    {
        if ((self::LEVELS[$level] ?? 0) >= (self::LEVELS[$this->minLevel] ?? 0)) {
            $this->inner->log($level, $message, $context);
        }
    }
}

// Композиция декораторов
$logger = new ContextEnrichingLogger(
    new LevelFilteringLogger(
        new FileLogger('/var/log/app.log'),
        minLevel: 'warning',
    ),
    requestId: bin2hex(random_bytes(8)),
);
```

## Observer (через PSR-14 EventDispatcher)

```php
// Событие
readonly class UserRegistered
{
    public function __construct(
        public int $userId,
        public string $email,
        public \DateTimeImmutable $registeredAt = new \DateTimeImmutable(),
    ) {}
}

// Слушатели
final class SendWelcomeEmail
{
    public function __construct(private readonly Mailer $mailer) {}

    public function __invoke(UserRegistered $event): void
    {
        $this->mailer->send($event->email, 'Welcome!', '...');
    }
}

final class CreateUserProfile
{
    public function __construct(private readonly ProfileRepository $profiles) {}

    public function __invoke(UserRegistered $event): void
    {
        $this->profiles->createDefault($event->userId);
    }
}

// Диспетчер (упрощённая реализация)
final class EventDispatcher
{
    /** @var array<class-string, array<callable>> */
    private array $listeners = [];

    public function listen(string $eventClass, callable $listener): void
    {
        $this->listeners[$eventClass][] = $listener;
    }

    public function dispatch(object $event): void
    {
        foreach ($this->listeners[$event::class] ?? [] as $listener) {
            $listener($event);
        }
    }
}
```

## CQRS (Command Query Responsibility Segregation)

```php
// Command — действие, не возвращает данные
readonly class CreateOrderCommand
{
    public function __construct(
        public int $userId,
        /** @var array<array{productId: int, quantity: int}> */
        public array $items,
        public ?string $couponCode = null,
    ) {}
}

// Command Handler
final class CreateOrderHandler
{
    public function __construct(
        private readonly OrderRepository $orders,
        private readonly ProductRepository $products,
        private readonly EventDispatcher $events,
    ) {}

    public function handle(CreateOrderCommand $command): int
    {
        $order = Order::create($command->userId);

        foreach ($command->items as $item) {
            $product = $this->products->findById($item['productId']);
            $order->addItem($product, $item['quantity']);
        }

        $this->orders->save($order);
        $this->events->dispatch(new OrderCreated($order->id));

        return $order->id;
    }
}

// Query — только чтение
readonly class GetOrderDetailsQuery
{
    public function __construct(
        public int $orderId,
    ) {}
}

// Query Handler
final class GetOrderDetailsHandler
{
    public function __construct(
        private readonly \PDO $readDb,  // может быть read-replica
    ) {}

    public function handle(GetOrderDetailsQuery $query): ?OrderDetailsDTO
    {
        $stmt = $this->readDb->prepare('
            SELECT o.*, u.name as customer_name
            FROM orders o
            JOIN users u ON u.id = o.user_id
            WHERE o.id = :id
        ');
        $stmt->execute(['id' => $query->orderId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $row ? OrderDetailsDTO::fromArray($row) : null;
    }
}

// Command Bus (упрощённый)
final class CommandBus
{
    /** @var array<class-string, callable> */
    private array $handlers = [];

    public function register(string $commandClass, callable $handler): void
    {
        $this->handlers[$commandClass] = $handler;
    }

    public function dispatch(object $command): mixed
    {
        $handler = $this->handlers[$command::class]
            ?? throw new \RuntimeException('No handler for ' . $command::class);

        return $handler($command);
    }
}
```

## Factory Method

```php
interface Notification
{
    public function send(string $recipient, string $message): void;
}

final class EmailNotification implements Notification { ... }
final class SmsNotification implements Notification { ... }
final class TelegramNotification implements Notification { ... }

enum NotificationChannel: string
{
    case Email = 'email';
    case Sms = 'sms';
    case Telegram = 'telegram';

    public function createNotification(ContainerInterface $container): Notification
    {
        return match ($this) {
            self::Email => $container->get(EmailNotification::class),
            self::Sms => $container->get(SmsNotification::class),
            self::Telegram => $container->get(TelegramNotification::class),
        };
    }
}
```

## Chain of Responsibility

```php
interface RequestHandler
{
    public function handle(Request $request): ?Response;
}

abstract class AbstractHandler implements RequestHandler
{
    private ?RequestHandler $next = null;

    public function setNext(RequestHandler $handler): RequestHandler
    {
        $this->next = $handler;
        return $handler;
    }

    public function handle(Request $request): ?Response
    {
        return $this->next?->handle($request);
    }
}

final class AuthenticationHandler extends AbstractHandler
{
    public function handle(Request $request): ?Response
    {
        if (!$request->hasHeader('Authorization')) {
            return new Response(401, 'Unauthorized');
        }
        return parent::handle($request);
    }
}

final class RateLimitHandler extends AbstractHandler
{
    public function handle(Request $request): ?Response
    {
        if ($this->isRateLimited($request->ip())) {
            return new Response(429, 'Too Many Requests');
        }
        return parent::handle($request);
    }
}

// Сборка цепочки
$auth = new AuthenticationHandler();
$rateLimit = new RateLimitHandler();
$auth->setNext($rateLimit);

$response = $auth->handle($request);
```
