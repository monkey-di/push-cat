# Bitrix D7 ORM — Полная справка

## Полная карта типов полей

```php
use Bitrix\Main\ORM\Fields;

// Скалярные
(new Fields\IntegerField('ID'))
    ->configurePrimary(true)
    ->configureAutocomplete(true)
    ->configureDefaultValue(0);

(new Fields\FloatField('PRICE'))
    ->configureScale(2)
    ->configureDefaultValue(0.00);

(new Fields\StringField('CODE'))
    ->configureSize(255)             // varchar(255)
    ->configureRequired(true)
    ->configureUnique(true)
    ->addValidator(new Fields\Validators\LengthValidator(1, 255))
    ->addValidator(new Fields\Validators\RegExpValidator('/^[a-z0-9_-]+$/'));

(new Fields\TextField('DESCRIPTION'))
    ->configureNullable(true);       // LONGTEXT

(new Fields\DateField('BIRTHDAY'));  // тип Date (без времени)

(new Fields\DatetimeField('CREATED_AT'))
    ->configureDefaultValue(function () {
        return new \Bitrix\Main\Type\DateTime();
    });

(new Fields\BooleanField('ACTIVE'))
    ->configureValues('N', 'Y')     // значения для false/true
    ->configureDefaultValue('Y');

(new Fields\EnumField('STATUS'))
    ->configureValues(['draft', 'published', 'archived'])
    ->configureDefaultValue('draft');

(new Fields\ArrayField('SETTINGS'))  // сериализация в JSON/serialize
    ->configureSerializationPhp();   // или configureSerializationJson()
```

## ExpressionField (вычисляемые)

```php
// Количество связанных записей
(new Fields\ExpressionField(
    'COMMENTS_COUNT',
    'COUNT(%s)',
    ['ID']
))

// Конкатенация
(new Fields\ExpressionField(
    'FULL_NAME',
    'CONCAT(%s, " ", %s)',
    ['FIRST_NAME', 'LAST_NAME']
))

// Подзапрос
(new Fields\ExpressionField(
    'LAST_ORDER_DATE',
    '(SELECT MAX(DATE_INSERT) FROM b_sale_order WHERE USER_ID = %s)',
    ['ID']
))
```

## Связи (Relations) — подробно

### Reference (FK → PK)

```php
// Много-к-одному: Item.AUTHOR_ID → User.ID
(new Fields\Relations\Reference(
    'AUTHOR',                           // Имя связи
    \Bitrix\Main\UserTable::class,      // Связанная сущность
    ['=this.AUTHOR_ID' => 'ref.ID']     // Условие join
))
    ->configureJoinType(Join::TYPE_LEFT) // LEFT JOIN (по умолчанию)

// Сложное условие
(new Fields\Relations\Reference(
    'ACTIVE_AUTHOR',
    \Bitrix\Main\UserTable::class,
    [
        '=this.AUTHOR_ID' => 'ref.ID',
        '=ref.ACTIVE' => new \Bitrix\Main\DB\SqlExpression('?s', 'Y'),
    ]
))
```

### OneToMany

```php
// Автор → его элементы
(new Fields\Relations\OneToMany(
    'ITEMS',                  // Имя связи
    ItemTable::class,         // Связанная сущность
    'AUTHOR'                  // Имя Reference в связанной сущности
))
```

### ManyToMany

```php
(new Fields\Relations\ManyToMany(
    'TAGS',
    TagTable::class
))
    ->configureMediatorTableName('vendor_module_item_tags')
    ->configureLocalPrimary('ID')
    ->configureLocalReference('ITEM_ID')
    ->configureRemotePrimary('ID')
    ->configureRemoteReference('TAG_ID')
```

## Query API

### getList (основной метод)

```php
$result = ItemTable::getList([
    'select' => [
        'ID',
        'NAME',
        'AUTHOR_NAME' => 'AUTHOR.NAME',    // Поле из связи
        'COMMENTS_CNT',                      // ExpressionField
    ],
    'filter' => [
        '=ACTIVE' => 'Y',
        '>PRICE' => 100,
        '%NAME' => 'test',                   // LIKE '%test%'
        '!CODE' => null,                     // IS NOT NULL
        [
            'LOGIC' => 'OR',
            ['=STATUS' => 'published'],
            ['>=DATE_END' => new \Bitrix\Main\Type\DateTime()],
        ],
    ],
    'order' => ['SORT' => 'ASC', 'ID' => 'DESC'],
    'limit' => 20,
    'offset' => 0,
    'count_total' => true,                    // COUNT(*) в отдельном запросе
    'group' => ['AUTHOR_ID'],
    'runtime' => [                            // Динамические поля
        new Fields\ExpressionField('ITEMS_COUNT', 'COUNT(%s)', ['ID']),
    ],
    'cache' => [
        'ttl' => 3600,
        'cache_joins' => true,
    ],
]);

// Итерация
while ($row = $result->fetch()) {
    // $row['ID'], $row['NAME'], ...
}

// Или массивом
$items = $result->fetchAll();

// Количество (если count_total = true)
$totalCount = $result->getCount();
```

### Операторы фильтра

| Оператор | SQL | Пример |
|----------|-----|--------|
| `=` | `= value` | `['=ID' => 5]` |
| `!` (без оператора) | `<> value` | `['!STATUS' => 'draft']` |
| `>` | `> value` | `['>PRICE' => 100]` |
| `>=` | `>= value` | `['>=SORT' => 0]` |
| `<` | `< value` | `['<SORT' => 500]` |
| `<=` | `<= value` | `['<=DATE' => $now]` |
| `%` | `LIKE %value%` | `['%NAME' => 'test']` |
| `=%` | `LIKE value%` | `['=%CODE' => 'item_']` |
| `%=` | `LIKE %value` | `['%=CODE' => '_item']` |
| `><` | `BETWEEN` | `['><PRICE' => [100, 500]]` |
| `!><` | `NOT BETWEEN` | `['!><PRICE' => [100, 500]]` |
| `@` | `IN (...)` | `['@ID' => [1, 2, 3]]` |
| `!@` | `NOT IN (...)` | `['!@ID' => [1, 2, 3]]` |

### CRUD

```php
// CREATE
$result = ItemTable::add([
    'NAME' => 'New Item',
    'CODE' => 'new-item',
    'ACTIVE' => 'Y',
]);
if ($result->isSuccess()) {
    $id = $result->getId();
} else {
    $errors = $result->getErrorMessages(); // array of strings
}

// READ
$item = ItemTable::getById($id)->fetch(); // одна запись или false
$item = ItemTable::getRow([               // getList + limit(1)
    'filter' => ['=CODE' => 'new-item'],
]);

// UPDATE
$result = ItemTable::update($id, [
    'NAME' => 'Updated Item',
]);
if (!$result->isSuccess()) {
    // обработка ошибок
}

// DELETE
$result = ItemTable::delete($id);
if (!$result->isSuccess()) {
    // обработка ошибок
}
```

## ORM-события

Каждый DataManager автоматически генерирует события:

| Событие | Когда | Можно отменить? |
|---------|-------|-----------------|
| `onBeforeAdd` | Перед INSERT | Да (добавить ошибку) |
| `onAdd` | Во время INSERT | Нет |
| `onAfterAdd` | После INSERT | Нет |
| `onBeforeUpdate` | Перед UPDATE | Да |
| `onUpdate` | Во время UPDATE | Нет |
| `onAfterUpdate` | После UPDATE | Нет |
| `onBeforeDelete` | Перед DELETE | Да |
| `onDelete` | Во время DELETE | Нет |
| `onAfterDelete` | После DELETE | Нет |

```php
// Обработчик в сущности
class ItemTable extends DataManager
{
    public static function onBeforeAdd(ORM\Event $event): ORM\EventResult
    {
        $result = new ORM\EventResult();
        $fields = $event->getParameter('fields');

        if (empty($fields['CODE'])) {
            $result->modifyFields([
                'CODE' => \CUtil::translit($fields['NAME'], 'ru'),
            ]);
        }

        return $result;
    }

    public static function onBeforeDelete(ORM\Event $event): ORM\EventResult
    {
        $result = new ORM\EventResult();
        $id = $event->getParameter('primary')['ID'];

        // Запретить удаление если есть зависимости
        $hasChildren = ChildTable::getCount(['=PARENT_ID' => $id]);
        if ($hasChildren > 0) {
            $result->addError(new ORM\EntityError('Cannot delete: has child records'));
        }

        return $result;
    }
}
```

## Валидаторы

```php
use Bitrix\Main\ORM\Fields\Validators;

(new Fields\StringField('EMAIL'))
    ->addValidator(new Validators\LengthValidator(5, 255))
    ->addValidator(new Validators\RegExpValidator('/^.+@.+\..+$/'))
    ->addValidator([static::class, 'validateEmailUnique']);

// Кастомный валидатор как метод класса
public static function validateEmailUnique(): array|Validators\Validator
{
    return new class extends Validators\Validator {
        public function validate($value, $primary, array $row, Fields\Field $field): bool|string
        {
            $existing = static::getRow([
                'filter' => ['=EMAIL' => $value, '!=ID' => $primary['ID'] ?? 0],
            ]);
            return $existing ? 'Email already exists' : true;
        }
    };
}
```

## SQL-таблица (миграция)

```sql
CREATE TABLE IF NOT EXISTS vendor_module_items (
    ID INT NOT NULL AUTO_INCREMENT,
    NAME VARCHAR(255) NOT NULL,
    CODE VARCHAR(255) DEFAULT NULL,
    DESCRIPTION LONGTEXT DEFAULT NULL,
    ACTIVE CHAR(1) NOT NULL DEFAULT 'Y',
    SORT INT NOT NULL DEFAULT 500,
    AUTHOR_ID INT DEFAULT NULL,
    PRICE DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    CREATED_AT DATETIME DEFAULT NULL,
    UPDATED_AT DATETIME DEFAULT NULL,
    PRIMARY KEY (ID),
    INDEX ix_active (ACTIVE),
    INDEX ix_code (CODE),
    INDEX ix_author (AUTHOR_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
