---
name: php-security
description: >
  PHP security expert. ALWAYS invoke this skill when the user asks about PHP security, XSS, SQL injection, CSRF, input validation, sanitization, or security audit of PHP code.
  Do not write security-sensitive PHP code directly -- use this skill first.
argument-hint: [check|fix]
---

# PHP 8+ — Безопасность

Выполни `$ARGUMENTS` — аудит или исправление безопасности.

## Быстрый чеклист

### Критичные (исправить немедленно)

- [ ] SQL-запросы используют prepared statements / параметризацию
- [ ] Пользовательский ввод не попадает в `eval()`, `exec()`, `system()`, `passthru()`
- [ ] HTML-вывод пользовательских данных экранирован (`htmlspecialchars()`)
- [ ] Пароли хешируются через `password_hash()` / `password_verify()`
- [ ] Файловые пути не содержат пользовательский ввод без валидации
- [ ] CSRF-токены проверяются на все мутирующие запросы
- [ ] Сессии регенерируются после авторизации (`session_regenerate_id(true)`)

### Важные

- [ ] `declare(strict_types=1)` в каждом файле
- [ ] Загруженные файлы проверяются по MIME и расширению
- [ ] HTTP-заголовки безопасности установлены
- [ ] Ошибки не отображаются в production (`display_errors=Off`)
- [ ] Sensitive-данные не логируются (пароли, токены, ключи)
- [ ] Зависимости актуальны (`composer audit`)

## Основные уязвимости и защита

### SQL Injection

```php
// УЯЗВИМО
$db->query("SELECT * FROM users WHERE id = $id");
$db->query("SELECT * FROM users WHERE name = '$name'");

// БЕЗОПАСНО — prepared statements
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
$stmt->execute(['id' => $id]);

$stmt = $pdo->prepare('SELECT * FROM users WHERE name = ?');
$stmt->execute([$name]);
```

### XSS (Cross-Site Scripting)

```php
// УЯЗВИМО
echo "<p>Hello, $userName</p>";
echo "<a href='$userUrl'>Link</a>";

// БЕЗОПАСНО
echo '<p>Hello, ' . htmlspecialchars($userName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>';

// Хелпер
function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
```

### CSRF

```php
// Генерация токена
function generateCsrfToken(): string
{
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    return $token;
}

// Проверка
function verifyCsrfToken(string $token): bool
{
    return isset($_SESSION['csrf_token'])
        && hash_equals($_SESSION['csrf_token'], $token);
}
```

### Пароли

```php
// Хеширование (при регистрации)
$hash = password_hash($password, PASSWORD_DEFAULT);

// Проверка (при входе)
if (password_verify($inputPassword, $storedHash)) {
    // OK
}

// Проверка необходимости перехеширования (после обновления PHP)
if (password_needs_rehash($storedHash, PASSWORD_DEFAULT)) {
    $newHash = password_hash($inputPassword, PASSWORD_DEFAULT);
    // сохранить $newHash в БД
}
```

## Действия

При `check` — анализируй код на уязвимости и выдай отчёт.
При `fix` — исправь найденные уязвимости.

Для полной справки по OWASP Top 10, headers и file upload смотри [reference.md](reference.md).
