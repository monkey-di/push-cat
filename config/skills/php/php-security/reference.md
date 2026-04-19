# PHP Security — Полная справка

## OWASP Top 10 для PHP

### 1. Injection (SQL, Command, LDAP, XPath)

#### SQL Injection

```php
// PDO — prepared statements
$pdo = new \PDO($dsn, $user, $pass, [
    \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
    \PDO::ATTR_EMULATE_PREPARES => false,  // Реальные prepared statements
    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
]);

// IN-запрос безопасно
$ids = [1, 2, 3];
$placeholders = implode(',', array_fill(0, count($ids), '?'));
$stmt = $pdo->prepare("SELECT * FROM users WHERE id IN ($placeholders)");
$stmt->execute($ids);

// LIKE безопасно
$search = '%' . addcslashes($userInput, '%_') . '%';
$stmt = $pdo->prepare('SELECT * FROM users WHERE name LIKE ?');
$stmt->execute([$search]);
```

#### Command Injection

```php
// УЯЗВИМО
exec("convert {$filename} output.png");
system("ping {$host}");

// БЕЗОПАСНО
exec('convert ' . escapeshellarg($filename) . ' output.png');

// Или лучше — белый список
$allowedCommands = ['resize', 'crop', 'rotate'];
if (!in_array($action, $allowedCommands, true)) {
    throw new \InvalidArgumentException('Invalid action');
}
```

#### Path Traversal

```php
// УЯЗВИМО
$file = $_GET['file'];
readfile("/uploads/$file");  // ../../../etc/passwd

// БЕЗОПАСНО
$filename = basename($_GET['file']);  // Убираем путь
$filepath = realpath("/uploads/$filename");

if ($filepath === false || !str_starts_with($filepath, realpath('/uploads/'))) {
    throw new \RuntimeException('Invalid file path');
}
readfile($filepath);
```

### 2. Broken Authentication

```php
// Безопасная сессия
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '1');     // Только HTTPS
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.use_strict_mode', '1');
ini_set('session.gc_maxlifetime', '1800'); // 30 минут

// Регенерация после авторизации
function loginUser(int $userId): void
{
    session_regenerate_id(true); // true = удалить старую сессию
    $_SESSION['user_id'] = $userId;
    $_SESSION['ip'] = $_SERVER['REMOTE_ADDR'];
    $_SESSION['user_agent'] = $_SERVER['HTTP_USER_AGENT'];
    $_SESSION['last_activity'] = time();
}

// Проверка сессии
function validateSession(): bool
{
    if (!isset($_SESSION['user_id'])) return false;

    // Таймаут неактивности
    if (time() - ($_SESSION['last_activity'] ?? 0) > 1800) {
        session_destroy();
        return false;
    }

    $_SESSION['last_activity'] = time();
    return true;
}

// Rate limiting для логина
function checkLoginAttempts(string $ip, string $email): bool
{
    $key = "login_attempts:{$ip}:{$email}";
    $attempts = (int)apcu_fetch($key);

    if ($attempts >= 5) {
        return false; // Заблокировано
    }

    apcu_inc($key, 1, $success, 900); // TTL 15 минут
    return true;
}
```

### 3. Sensitive Data Exposure

```php
// Шифрование данных
function encrypt(string $data, string $key): string
{
    $iv = random_bytes(openssl_cipher_iv_length('aes-256-gcm'));
    $tag = '';
    $encrypted = openssl_encrypt($data, 'aes-256-gcm', $key, 0, $iv, $tag);

    return base64_encode($iv . $tag . $encrypted);
}

function decrypt(string $encrypted, string $key): string|false
{
    $data = base64_decode($encrypted);
    $ivLength = openssl_cipher_iv_length('aes-256-gcm');
    $iv = substr($data, 0, $ivLength);
    $tag = substr($data, $ivLength, 16);
    $ciphertext = substr($data, $ivLength + 16);

    return openssl_decrypt($ciphertext, 'aes-256-gcm', $key, 0, $iv, $tag);
}

// Безопасное сравнение (constant-time)
hash_equals($knownHash, $userHash); // Защита от timing-атак
```

### 4. XML External Entities (XXE)

```php
// Отключение внешних сущностей
libxml_disable_entity_loader(true); // Deprecated в PHP 8.0, но для старых версий
$xml = new \DOMDocument();
$xml->loadXML($input, LIBXML_NOENT | LIBXML_DTDLOAD);

// Безопасный парсинг
$reader = new \XMLReader();
$reader->xml($input);
// XMLReader по умолчанию безопасен в PHP 8+
```

### 5. Broken Access Control

```php
// Проверка авторизации на уровне каждого действия
function deleteUser(int $targetId, User $currentUser): void
{
    // Проверка прав
    if (!$currentUser->can(Permission::Delete) && $currentUser->id !== $targetId) {
        throw new ForbiddenException('Insufficient permissions');
    }

    // IDOR-защита — проверяй, что ресурс принадлежит пользователю
    $target = $this->repository->findById($targetId);
    if ($target->organizationId !== $currentUser->organizationId) {
        throw new ForbiddenException('Access denied');
    }
}
```

## Валидация и санитизация

### Валидация (проверка)

```php
// filter_var — встроенные фильтры
$email = filter_var($input, FILTER_VALIDATE_EMAIL);       // string|false
$url = filter_var($input, FILTER_VALIDATE_URL);
$ip = filter_var($input, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4);
$int = filter_var($input, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1, 'max_range' => 1000],
]);

// Класс валидатора
final class InputValidator
{
    /**
     * @param array<string, mixed> $data
     * @param array<string, array<string>> $rules
     * @return array<string, array<string>> Ошибки по полям
     */
    public static function validate(array $data, array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $fieldRules) {
            $value = $data[$field] ?? null;

            foreach ($fieldRules as $rule) {
                $error = match ($rule) {
                    'required' => $value === null || $value === '' ? "$field is required" : null,
                    'email' => !filter_var($value, FILTER_VALIDATE_EMAIL) ? "Invalid email" : null,
                    'integer' => !filter_var($value, FILTER_VALIDATE_INT) ? "Must be integer" : null,
                    default => null,
                };

                if ($error !== null) {
                    $errors[$field][] = $error;
                }
            }
        }

        return $errors;
    }
}
```

### Санитизация (очистка)

```php
// HTML
$clean = htmlspecialchars($input, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

// Strip tags (осторожно — не полная защита от XSS)
$clean = strip_tags($input, ['<p>', '<br>', '<strong>', '<em>']);

// filter_var — санитизация
$email = filter_var($input, FILTER_SANITIZE_EMAIL);
$url = filter_var($input, FILTER_SANITIZE_URL);
$string = filter_var($input, FILTER_SANITIZE_SPECIAL_CHARS);
$int = filter_var($input, FILTER_SANITIZE_NUMBER_INT);
```

## HTTP-заголовки безопасности

```php
// Установка заголовков
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 0');  // Устаревший, но безопасно отключить
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

// Content Security Policy
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'");

// Strict Transport Security (только HTTPS)
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

// Класс-хелпер
final class SecurityHeaders
{
    public static function send(): void
    {
        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
            'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains',
        ];

        foreach ($headers as $name => $value) {
            header("$name: $value");
        }
    }
}
```

## Безопасная загрузка файлов

```php
final class FileUploadHandler
{
    private const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
    ];

    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
    private const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

    public function __construct(
        private readonly string $uploadDir,
    ) {}

    public function handle(array $file): string
    {
        // 1. Проверка ошибок
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('Upload failed: ' . $file['error']);
        }

        // 2. Проверка размера
        if ($file['size'] > self::MAX_FILE_SIZE) {
            throw new \RuntimeException('File too large');
        }

        // 3. Проверка расширения
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new \RuntimeException('Invalid file extension');
        }

        // 4. Проверка MIME-типа (по содержимому, не по заголовку)
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        if (!in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
            throw new \RuntimeException('Invalid file type');
        }

        // 5. Генерация безопасного имени
        $safeName = bin2hex(random_bytes(16)) . '.' . $extension;
        $destination = $this->uploadDir . '/' . $safeName;

        // 6. Перемещение (важно: move_uploaded_file, не copy)
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new \RuntimeException('Failed to move uploaded file');
        }

        // 7. Установка прав
        chmod($destination, 0644);

        return $safeName;
    }
}
```

## Генерация случайных данных

```php
// Криптографически стойкие
$bytes = random_bytes(32);                           // бинарные данные
$int = random_int(100000, 999999);                   // случайное число
$token = bin2hex(random_bytes(32));                   // hex-токен
$urlSafe = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='); // URL-safe

// НИКОГДА не используй для безопасности:
// rand(), mt_rand(), uniqid(), md5(time()), sha1(microtime())
```

## Composer Security

```bash
# Аудит уязвимостей в зависимостях
composer audit

# Проверка устаревших пакетов
composer outdated --direct

# Блокировка версий в production
composer install --no-dev --prefer-dist --optimize-autoloader
```
