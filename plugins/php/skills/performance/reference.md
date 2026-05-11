# PHP Performance — Полная справка

## OPcache

### Конфигурация для production

```ini
[opcache]
opcache.enable=1
opcache.enable_cli=0                    ; CLI обычно не нужен, кроме long-running
opcache.memory_consumption=256          ; MB, зависит от размера проекта
opcache.interned_strings_buffer=16      ; MB для интернированных строк
opcache.max_accelerated_files=20000     ; Максимум кешированных файлов
opcache.validate_timestamps=0           ; НЕ проверять изменения (production!)
opcache.revalidate_freq=0              ; Игнорируется при validate_timestamps=0
opcache.save_comments=0                ; Убрать комментарии (если не нужны annotations)
opcache.enable_file_override=1          ; Ускорить file_exists/is_file
```

### Preloading (PHP 7.4+)

```ini
opcache.preload=/app/preload.php
opcache.preload_user=www-data
```

```php
// preload.php — загрузить часто используемые классы в OPcache раз и навсегда
$classMap = require __DIR__ . '/vendor/composer/autoload_classmap.php';

foreach ($classMap as $class => $file) {
    // Загружаем ядро приложения
    if (str_starts_with($class, 'App\\Entity\\')
        || str_starts_with($class, 'App\\Service\\')
    ) {
        opcache_compile_file($file);
    }
}
```

### Мониторинг OPcache

```php
$status = opcache_get_status();

$hitRate = $status['opcache_statistics']['opcache_hit_rate'];          // % хитов
$usedMemory = $status['memory_usage']['used_memory'];                  // Использовано
$freeMemory = $status['memory_usage']['free_memory'];                  // Свободно
$cachedScripts = $status['opcache_statistics']['num_cached_scripts'];  // Скриптов
$missRate = $status['opcache_statistics']['misses'];                   // Промахов
```

## JIT (PHP 8.0+)

```ini
; Tracing JIT — лучший для веб-приложений
opcache.jit=1255
opcache.jit_buffer_size=128M

; Разбор значения 1255:
; 1 — CPU-specific optimization
; 2 — tracing mode
; 5 — register allocation optimization
; 5 — JIT trigger (hot counter threshold)

; Для CLI / long-running:
opcache.jit=1205
```

### Когда JIT помогает

| Помогает | Не помогает |
|----------|-------------|
| CPU-bound задачи (математика, парсинг) | I/O-bound (БД, сеть, файлы) |
| Циклы с простыми операциями | Работа с массивами (уже оптимизирована в Zend) |
| Научные вычисления | Типичные CRUD-приложения |
| Image processing | Шаблонизация |

## Профилирование

### Xdebug Profiling

```ini
; php.ini
xdebug.mode=profile
xdebug.output_dir=/tmp/xdebug
xdebug.profiler_output_name=cachegrind.out.%p.%t

; Профилирование по запросу (через trigger):
xdebug.start_with_request=trigger
; Добавить ?XDEBUG_PROFILE=1 в URL
```

Анализ: KCacheGrind (Linux), QCacheGrind (macOS/Windows), Webgrind (web).

### Встроенное измерение

```php
// Время выполнения
$start = hrtime(true);
// ... код ...
$elapsed = (hrtime(true) - $start) / 1_000_000_000; // секунды
printf("Elapsed: %.4f s\n", $elapsed);

// Память
$memBefore = memory_get_usage(true);
// ... код ...
$memAfter = memory_get_usage(true);
printf("Memory delta: %s\n", formatBytes($memAfter - $memBefore));

// Пиковое потребление
printf("Peak memory: %s\n", formatBytes(memory_get_peak_usage(true)));

function formatBytes(int $bytes): string
{
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = 0;
    while ($bytes >= 1024 && $i < count($units) - 1) {
        $bytes /= 1024;
        $i++;
    }
    return round($bytes, 2) . ' ' . $units[$i];
}
```

### Простой Profiler

```php
final class Profiler
{
    /** @var array<string, array{start: float, elapsed: float, count: int}> */
    private static array $timers = [];

    public static function start(string $name): void
    {
        self::$timers[$name] ??= ['start' => 0, 'elapsed' => 0, 'count' => 0];
        self::$timers[$name]['start'] = hrtime(true);
    }

    public static function stop(string $name): float
    {
        $elapsed = (hrtime(true) - self::$timers[$name]['start']) / 1_000_000;
        self::$timers[$name]['elapsed'] += $elapsed;
        self::$timers[$name]['count']++;
        return $elapsed;
    }

    /** @return array<string, array{elapsed_ms: float, count: int, avg_ms: float}> */
    public static function getResults(): array
    {
        $results = [];
        foreach (self::$timers as $name => $data) {
            $results[$name] = [
                'elapsed_ms' => round($data['elapsed'], 2),
                'count' => $data['count'],
                'avg_ms' => round($data['elapsed'] / max(1, $data['count']), 2),
            ];
        }
        arsort($results);
        return $results;
    }
}
```

## Оптимизация работы с данными

### Генераторы

```php
// Чтение большого CSV без загрузки в память
function readCsv(string $path): \Generator
{
    $handle = fopen($path, 'r');
    if ($handle === false) {
        throw new \RuntimeException("Cannot open: $path");
    }

    try {
        $headers = fgetcsv($handle);
        while (($row = fgetcsv($handle)) !== false) {
            yield array_combine($headers, $row);
        }
    } finally {
        fclose($handle);
    }
}

// Обработка файла 10 GB = несколько MB памяти
foreach (readCsv('/data/huge.csv') as $row) {
    processRow($row);
}
```

### Batch-обработка

```php
function processBatch(\PDO $pdo, int $batchSize = 1000): void
{
    $offset = 0;

    do {
        $stmt = $pdo->prepare('SELECT * FROM records LIMIT :limit OFFSET :offset');
        $stmt->bindValue(':limit', $batchSize, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        $count = count($rows);

        foreach ($rows as $row) {
            process($row);
        }

        $offset += $batchSize;
        gc_collect_cycles(); // Освободить память
    } while ($count === $batchSize);
}
```

### Мемоизация

```php
final class Memoize
{
    /** @var array<string, mixed> */
    private static array $cache = [];

    /**
     * @template T
     * @param callable(): T $fn
     * @return T
     */
    public static function once(string $key, callable $fn): mixed
    {
        return self::$cache[$key] ??= $fn();
    }

    public static function clear(?string $key = null): void
    {
        if ($key === null) {
            self::$cache = [];
        } else {
            unset(self::$cache[$key]);
        }
    }
}

// Использование
$config = Memoize::once('app_config', fn() => parse_ini_file('/etc/app.ini'));
```

### WeakMap (PHP 8.0)

```php
// WeakMap — ключи объекты, которые garbage collector может удалить
$cache = new \WeakMap();

function enrichUser(User $user): EnrichedUser
{
    global $cache;

    // Кеш привязан к жизни объекта — нет утечек памяти
    if (!isset($cache[$user])) {
        $cache[$user] = new EnrichedUser($user, loadExtraData($user->id));
    }

    return $cache[$user];
}
```

## Оптимизация строк

```php
// Конкатенация в цикле — медленно
$result = '';
foreach ($items as $item) {
    $result .= $item . ', ';
}

// implode — быстро
$result = implode(', ', $items);

// Буферизация вывода
ob_start();
foreach ($items as $item) {
    echo "<li>$item</li>";
}
$html = ob_get_clean();

// sprintf вместо конкатенации для форматирования
$message = sprintf('User %s (ID: %d) logged in at %s', $name, $id, $date);
```

## Оптимизация массивов

```php
// isset() быстрее array_key_exists()
if (isset($array[$key])) { ... }  // Быстрее
if (array_key_exists($key, $array)) { ... }  // Медленнее

// Для lookup-таблиц — ключи вместо значений
$allowed = ['admin' => true, 'editor' => true, 'viewer' => true];
if (isset($allowed[$role])) { ... }  // O(1)

// Вместо array_search
$roles = ['admin', 'editor', 'viewer'];
if (in_array($role, $roles, true)) { ... }  // O(n)

// array_column для перестройки
$usersById = array_column($users, null, 'id');  // O(n) — один проход

// Chunk для больших массивов
foreach (array_chunk($bigArray, 100) as $chunk) {
    processBatch($chunk);
}
```

## Кеширование

### APCu (in-memory, один сервер)

```php
// Сохранение
apcu_store('key', $data, 3600);  // TTL 3600 секунд

// Чтение
$data = apcu_fetch('key', $success);
if (!$success) {
    $data = computeExpensiveData();
    apcu_store('key', $data, 3600);
}

// Атомарный fetch-or-compute
$data = apcu_entry('key', function () {
    return computeExpensiveData();
}, 3600);

// Удаление
apcu_delete('key');

// Инкремент/декремент (атомарно)
apcu_inc('counter');
apcu_dec('counter');
```

### Redis (PSR-6/PSR-16)

```php
// PSR-16 SimpleCache интерфейс
use Psr\SimpleCache\CacheInterface;

final class UserService
{
    public function __construct(
        private readonly CacheInterface $cache,
        private readonly UserRepository $repository,
    ) {}

    public function getUser(int $id): ?User
    {
        $key = "user:$id";

        $user = $this->cache->get($key);
        if ($user !== null) {
            return $user;
        }

        $user = $this->repository->findById($id);
        if ($user !== null) {
            $this->cache->set($key, $user, 3600);
        }

        return $user;
    }

    public function updateUser(int $id, array $data): void
    {
        $this->repository->update($id, $data);
        $this->cache->delete("user:$id");  // Инвалидация
    }
}
```

## Оптимизация SQL

```php
// 1. Индексы — убедись, что фильтры и JOIN используют индексы
// EXPLAIN ANALYZE SELECT ...

// 2. Выбирай только нужные поля
$pdo->query('SELECT id, name FROM users');  // Не SELECT *

// 3. Пагинация через курсор (не OFFSET)
// Плохо для больших offset:
$stmt = $pdo->prepare('SELECT * FROM items ORDER BY id LIMIT 20 OFFSET 100000');

// Хорошо — cursor pagination:
$stmt = $pdo->prepare('SELECT * FROM items WHERE id > :lastId ORDER BY id LIMIT 20');
$stmt->execute(['lastId' => $lastSeenId]);

// 4. Bulk INSERT
$values = [];
$params = [];
foreach ($items as $i => $item) {
    $values[] = "(:name_$i, :price_$i)";
    $params["name_$i"] = $item['name'];
    $params["price_$i"] = $item['price'];
}
$sql = 'INSERT INTO items (name, price) VALUES ' . implode(', ', $values);
$pdo->prepare($sql)->execute($params);

// 5. Connection pooling — persistent connections
$pdo = new \PDO($dsn, $user, $pass, [\PDO::ATTR_PERSISTENT => true]);
```

## Асинхронность

### Fibers (PHP 8.1)

```php
// Fibers позволяют кооперативную многозадачность
$fiber = new \Fiber(function (): string {
    // Имитация async I/O
    $data = \Fiber::suspend('waiting for data...');
    return "Processed: $data";
});

$result = $fiber->start();       // 'waiting for data...'
$final = $fiber->resume('hello'); // 'Processed: hello'
```

### Parallel HTTP-запросы (curl_multi)

```php
function parallelFetch(array $urls): array
{
    $multiHandle = curl_multi_init();
    $handles = [];

    foreach ($urls as $key => $url) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_multi_add_handle($multiHandle, $ch);
        $handles[$key] = $ch;
    }

    do {
        $status = curl_multi_exec($multiHandle, $active);
        curl_multi_select($multiHandle);
    } while ($active && $status === CURLM_OK);

    $results = [];
    foreach ($handles as $key => $ch) {
        $results[$key] = curl_multi_getcontent($ch);
        curl_multi_remove_handle($multiHandle, $ch);
        curl_close($ch);
    }

    curl_multi_close($multiHandle);
    return $results;
}
```
