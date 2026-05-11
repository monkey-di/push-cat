# PHPUnit 10+ — Полная справка

## Конфигурация (phpunit.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
    bootstrap="vendor/autoload.php"
    colors="true"
    failOnWarning="true"
    failOnRisky="true"
    cacheDirectory=".phpunit.cache"
>
    <testsuites>
        <testsuite name="unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="integration">
            <directory>tests/Integration</directory>
        </testsuite>
    </testsuites>

    <source>
        <include>
            <directory>src</directory>
        </include>
    </source>

    <coverage>
        <report>
            <html outputDirectory="coverage"/>
            <clover outputFile="coverage/clover.xml"/>
        </report>
    </coverage>
</phpunit>
```

## Attributes (PHPUnit 10+)

```php
use PHPUnit\Framework\Attributes\{
    Test,
    DataProvider,
    CoversClass,
    CoversMethod,
    Depends,
    Group,
    TestWith,
    Before,
    After,
    BeforeClass,
    AfterClass,
};

#[CoversClass(Calculator::class)]
#[Group('math')]
final class CalculatorTest extends TestCase
{
    #[Test]
    public function addsNumbers(): void { ... }

    #[Test]
    #[DataProvider('additionProvider')]
    public function addsWithProvider(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, (new Calculator())->add($a, $b));
    }

    /** @return array<string, array{int, int, int}> */
    public static function additionProvider(): array
    {
        return [
            'positive numbers' => [1, 2, 3],
            'negative numbers' => [-1, -2, -3],
            'zero' => [0, 0, 0],
            'mixed' => [-1, 1, 0],
        ];
    }

    #[Test]
    #[TestWith([1, 1, 2])]
    #[TestWith([0, 0, 0])]
    #[TestWith([-1, 1, 0])]
    public function addsInline(int $a, int $b, int $expected): void
    {
        $this->assertSame($expected, (new Calculator())->add($a, $b));
    }
}
```

## Assertions — основные

```php
// Equality
$this->assertSame($expected, $actual);        // === (тип + значение)
$this->assertEquals($expected, $actual);      // == (с приведением типов)
$this->assertNotSame($expected, $actual);

// Boolean
$this->assertTrue($value);
$this->assertFalse($value);

// Null
$this->assertNull($value);
$this->assertNotNull($value);

// Type
$this->assertInstanceOf(User::class, $object);

// String
$this->assertStringContainsString('needle', $haystack);
$this->assertStringStartsWith('prefix', $string);
$this->assertStringEndsWith('suffix', $string);
$this->assertMatchesRegularExpression('/\d+/', $string);
$this->assertEmpty($string);

// Array
$this->assertCount(3, $array);
$this->assertContains($value, $array);
$this->assertArrayHasKey('key', $array);
$this->assertEmpty($array);

// Numeric
$this->assertGreaterThan(0, $value);
$this->assertLessThanOrEqual(100, $value);

// File
$this->assertFileExists($path);
$this->assertFileEquals($expected, $actual);

// JSON
$this->assertJson($jsonString);
$this->assertJsonStringEqualsJsonString($expected, $actual);

// Object
$this->assertObjectHasProperty('name', $object);
```

## Тестирование исключений

```php
#[Test]
public function throwsOnInvalidEmail(): void
{
    $this->expectException(\InvalidArgumentException::class);
    $this->expectExceptionMessage('Invalid email');
    $this->expectExceptionCode(400);

    new Email('not-an-email');
}

// Или с closure (предпочтительно для проверки нескольких свойств)
#[Test]
public function throwsOnInvalidAge(): void
{
    try {
        new User('John', -1);
        $this->fail('Expected exception was not thrown');
    } catch (\DomainException $e) {
        $this->assertSame('Age must be positive', $e->getMessage());
        $this->assertSame(422, $e->getCode());
    }
}
```

## Mocks и Stubs

### Mock (с проверкой вызовов)

```php
#[Test]
public function savesUserToRepository(): void
{
    $user = new User(1, 'John');

    // Mock — проверяет, что метод был вызван
    $this->repository
        ->expects($this->once())            // ровно один раз
        ->method('save')
        ->with($user);                       // с этим аргументом

    $this->sut->register($user);
}

// Матчеры количества вызовов
$this->never()                  // 0 раз
$this->once()                   // 1 раз
$this->exactly(3)               // ровно 3 раза
$this->atLeast(1)               // >= 1
$this->atMost(5)                // <= 5
$this->any()                    // 0 или более
```

### Stub (без проверки вызовов)

```php
#[Test]
public function formatsUserFullName(): void
{
    // Stub — просто возвращает заданное значение
    $this->repository
        ->method('findById')
        ->willReturn(new User(1, 'John', 'Doe'));

    $result = $this->sut->getFullName(1);

    $this->assertSame('John Doe', $result);
}
```

### Последовательные возвраты

```php
$mock->method('fetch')
    ->willReturnOnConsecutiveCalls(
        ['id' => 1, 'name' => 'First'],
        ['id' => 2, 'name' => 'Second'],
        false,  // третий вызов
    );
```

### Callback в willReturn

```php
$mock->method('findById')
    ->willReturnCallback(function (int $id): ?User {
        return $id > 0 ? new User($id, "User #$id") : null;
    });
```

### Бросание исключений

```php
$mock->method('save')
    ->willThrowException(new \RuntimeException('DB error'));
```

### Матчеры аргументов

```php
$mock->expects($this->once())
    ->method('save')
    ->with(
        $this->isInstanceOf(User::class),
        $this->greaterThan(0),
        $this->stringContains('test'),
        $this->callback(fn($value) => $value > 10),
        $this->anything(),
    );
```

## setUp / tearDown

```php
final class DatabaseTest extends TestCase
{
    private static \PDO $pdo;
    private \PDO $connection;

    // Один раз перед ВСЕМИ тестами класса
    #[BeforeClass]
    public static function createDatabase(): void
    {
        self::$pdo = new \PDO('sqlite::memory:');
        self::$pdo->exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
    }

    // Перед КАЖДЫМ тестом
    protected function setUp(): void
    {
        $this->connection = self::$pdo;
        $this->connection->beginTransaction();
    }

    // После КАЖДОГО теста
    protected function tearDown(): void
    {
        $this->connection->rollBack();
    }

    // Один раз после ВСЕХ тестов класса
    #[AfterClass]
    public static function dropDatabase(): void
    {
        self::$pdo = null;
    }
}
```

## Зависимости между тестами

```php
#[Test]
public function createsUser(): int
{
    $id = $this->userService->create('John');
    $this->assertGreaterThan(0, $id);
    return $id;
}

#[Test]
#[Depends('createsUser')]
public function findsCreatedUser(int $userId): void
{
    $user = $this->userService->findById($userId);
    $this->assertNotNull($user);
    $this->assertSame('John', $user->name);
}
```

## Интеграционные тесты

```php
#[CoversClass(UserRepository::class)]
#[Group('integration')]
final class UserRepositoryIntegrationTest extends TestCase
{
    private \PDO $pdo;
    private UserRepository $repository;

    protected function setUp(): void
    {
        $this->pdo = new \PDO('sqlite::memory:');
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec('
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE
            )
        ');

        $this->repository = new UserRepository($this->pdo);
    }

    #[Test]
    public function savesAndFindsUser(): void
    {
        $user = new User(null, 'John', 'john@example.com');

        $this->repository->save($user);

        $found = $this->repository->findByEmail('john@example.com');
        $this->assertNotNull($found);
        $this->assertSame('John', $found->name);
    }

    #[Test]
    public function returnsNullForNonExistentUser(): void
    {
        $this->assertNull($this->repository->findById(999));
    }
}
```

## Custom Assertions

```php
trait MoneyAssertions
{
    public static function assertMoneyEquals(int $expectedAmount, string $expectedCurrency, Money $actual): void
    {
        self::assertSame($expectedAmount, $actual->amount, 'Money amount mismatch');
        self::assertSame($expectedCurrency, $actual->currency->value, 'Currency mismatch');
    }
}

final class OrderTest extends TestCase
{
    use MoneyAssertions;

    #[Test]
    public function calculatesTotal(): void
    {
        $order = new Order();
        $order->addItem(new Item('A', new Money(1000, Currency::RUB)));
        $order->addItem(new Item('B', new Money(2000, Currency::RUB)));

        self::assertMoneyEquals(3000, 'RUB', $order->total());
    }
}
```

## Запуск тестов

```bash
# Все тесты
vendor/bin/phpunit

# Конкретный класс
vendor/bin/phpunit tests/Unit/Service/UserServiceTest.php

# Конкретный метод
vendor/bin/phpunit --filter=findsUserById

# Группа
vendor/bin/phpunit --group=integration

# С покрытием
vendor/bin/phpunit --coverage-html coverage/

# Конкретный testsuite
vendor/bin/phpunit --testsuite=unit
```
