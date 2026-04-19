# Конвенции и Best Practices Bitrix D7

## Код-стайл

### Именование

| Элемент | Стиль | Пример |
|---------|-------|--------|
| Класс | PascalCase | `ElementTable`, `OrderService` |
| Метод | camelCase | `getList()`, `addItem()` |
| Свойство | camelCase | `$primaryKey`, `$tableName` |
| Константа | UPPER_SNAKE | `TABLE_NAME`, `MAX_RETRY` |
| Переменная | camelCase | `$elementId`, `$filterParams` |
| Таблица БД | snake_case с префиксом | `vendor_module_items` |
| Модуль | vendor.modulename | `mycompany.catalog` |

### Структура файлов

- Один класс на файл
- Файл именуется по классу в нижнем регистре: `MyClass` → `myclass.php`
- Каталог `lib/` зеркалирует namespace (в нижнем регистре)

## Best Practices

### 1. Загрузка модулей

```php
// Правильно — проверка загрузки
if (Loader::includeModule('iblock')) {
    // работа с инфоблоками
}

// Правильно — exception если модуль критичен
Loader::requireModule('iblock');
```

### 2. Работа с запросами к БД

```php
// Правильно — ORM
$items = ItemTable::getList([
    'select' => ['ID', 'NAME', 'PRICE'],
    'filter' => ['=ACTIVE' => 'Y', '>PRICE' => 0],
    'order' => ['SORT' => 'ASC'],
    'limit' => 20,
])->fetchAll();

// Неправильно — прямой SQL
$DB->Query("SELECT * FROM items WHERE ACTIVE='Y'");
```

### 3. Кеширование

```php
use Bitrix\Main\Data\Cache;

$cache = Cache::createInstance();
$cacheTime = 3600;
$cacheId = 'my_data_' . md5(serialize($params));
$cacheDir = '/my_module/data/';

if ($cache->initCache($cacheTime, $cacheId, $cacheDir)) {
    $result = $cache->getVars();
} elseif ($cache->startDataCache()) {
    $result = $this->fetchData($params);

    if (empty($result)) {
        $cache->abortDataCache();
    } else {
        $cache->endDataCache($result);
    }
}
```

### 4. Тегированный кеш

```php
use Bitrix\Main\Data\TaggedCache;

$taggedCache = Application::getInstance()->getTaggedCache();

// При записи кеша
$taggedCache->startTagCache($cacheDir);
$taggedCache->registerTag('iblock_id_' . $iblockId);
$taggedCache->endTagCache();

// При инвалидации
$taggedCache->clearByTag('iblock_id_' . $iblockId);
```

### 5. Обработка ошибок D7

```php
use Bitrix\Main\ORM\Data\AddResult;

$result = ItemTable::add(['NAME' => $name]);

if ($result->isSuccess()) {
    $newId = $result->getId();
} else {
    $errors = $result->getErrorMessages();
    // Обработка ошибок
}
```

### 6. Локализация

```php
use Bitrix\Main\Localization\Loc;

// В начале файла
Loc::loadMessages(__FILE__);

// Использование
$title = Loc::getMessage('MY_MODULE_ITEM_TITLE');
$message = Loc::getMessage('MY_MODULE_GREETING', ['#NAME#' => $userName]);
```

Файл `lang/ru/path/to/file.php`:
```php
$MESS['MY_MODULE_ITEM_TITLE'] = 'Заголовок элемента';
$MESS['MY_MODULE_GREETING'] = 'Привет, #NAME#!';
```

## Антипаттерны

### Запрещено

1. **Модификация ядра** — файлы в `/bitrix/` не трогать, всё в `/local/`
2. **Старый API в новом коде** — `CIBlockElement`, `CUser::GetList()`, `$GLOBALS['DB']`
3. **Прямой SQL** — вместо этого ORM или `$connection->query()` (только в крайнем случае)
4. **Бизнес-логика в шаблонах компонентов** — только отображение
5. **Тяжёлые операции в init.php** — init.php выполняется на каждом хите
6. **Хардкод ID** инфоблоков, свойств, групп — использовать символьные коды и API-коды
7. **Игнорирование Result** — всегда проверять `isSuccess()` у AddResult/UpdateResult/DeleteResult

### Предпочтительно

1. **Символьные коды** вместо числовых ID для инфоблоков, свойств, разделов
2. **API-код инфоблока** для генерации ORM-классов (`Bitrix\Iblock\Elements\ElementXxxTable`)
3. **Managed Cache** для данных, зависящих от тегов
4. **Service Locator** для DI вместо синглтонов в кастомном коде
5. **Валидаторы ORM** для проверки данных на уровне сущности
6. **Событийная модель** — расширение через события, а не переопределение
