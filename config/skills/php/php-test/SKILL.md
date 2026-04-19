---
name: php-test
description: >
  PHPUnit testing expert. ALWAYS invoke this skill when the user asks about PHPUnit, unit tests, integration tests, test configuration, phpunit.xml, mocking, or test coverage in PHP.
  Do not write PHPUnit tests directly -- use this skill first.
argument-hint: [target-class-or-file]
---

# PHP 8+ — Создание тестов

Создай тесты для `$ARGUMENTS`.

## Процесс

### 1. Проанализируй класс/функцию

- Прочитай исходный код
- Определи публичные методы (они тестируются)
- Выяви зависимости (что мокать)
- Найди граничные случаи и edge cases

### 2. Создай тестовый класс

```php
<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\UserService;
use App\Repository\UserRepositoryInterface;
use App\Entity\User;
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\CoversClass;

#[CoversClass(UserService::class)]
final class UserServiceTest extends TestCase
{
    private UserService $sut; // System Under Test
    private UserRepositoryInterface&\PHPUnit\Framework\MockObject\MockObject $repository;

    protected function setUp(): void
    {
        $this->repository = $this->createMock(UserRepositoryInterface::class);
        $this->sut = new UserService($this->repository);
    }

    #[Test]
    public function findsUserById(): void
    {
        $user = new User(1, 'John', 'john@example.com');
        $this->repository
            ->expects($this->once())
            ->method('findById')
            ->with(1)
            ->willReturn($user);

        $result = $this->sut->findById(1);

        $this->assertSame($user, $result);
    }

    #[Test]
    public function returnsNullWhenUserNotFound(): void
    {
        $this->repository
            ->method('findById')
            ->willReturn(null);

        $this->assertNull($this->sut->findById(999));
    }
}
```

### 3. Что тестировать

| Тестируй | Не тестируй |
|----------|-------------|
| Публичные методы | Private/protected методы напрямую |
| Граничные значения | Реализацию (моки сторонних библиотек) |
| Ошибки и исключения | Конструкторы без логики |
| Бизнес-логику | Геттеры/сеттеры без логики |
| Интеграцию компонентов | Фреймворк/библиотеки |

### 4. Именование тестов

Стиль: `описание_поведения` или `camelCase описание`:
- `findsUserById`
- `throwsExceptionWhenEmailInvalid`
- `returnsEmptyArrayWhenNoResults`
- `calculatesDiscountForPremiumUsers`

### 5. Структура теста — AAA

```php
#[Test]
public function calculatesTotal(): void
{
    // Arrange — подготовка
    $order = new Order();
    $order->addItem(new Item('Widget', 1000));
    $order->addItem(new Item('Gadget', 2000));

    // Act — действие
    $total = $order->calculateTotal();

    // Assert — проверка
    $this->assertSame(3000, $total);
}
```

Для полной справки по PHPUnit API, моки и providers смотри [reference.md](reference.md).
