---
name: bitrix-orm
description: >
  Bitrix D7 ORM expert. ALWAYS invoke this skill when the user asks about DataManager, ORM entities, Bitrix tables, entity relations, D7 queries, or getList/getById.
  Do not write DataManager/Table classes or ORM queries directly -- use this skill first.
argument-hint: [entity-name]
---

# Bitrix D7 ORM — Создание/работа с сущностью

Создай или модифицируй ORM-сущность `$ARGUMENTS` для Bitrix D7.

## Процесс

### 1. Определи контекст

- Если сущность принадлежит кастомному модулю — размести в `local/modules/<vendor.module>/lib/`
- Namespace должен соответствовать пути: `Vendor\Module\SubDir` → `lib/subdir/`
- Имя класса: `<EntityName>Table` (суффикс Table обязателен для DataManager)

### 2. Создай класс DataManager

```php
namespace Vendor\Module;

use Bitrix\Main\ORM\Data\DataManager;
use Bitrix\Main\ORM\Fields;

class ItemTable extends DataManager
{
    public static function getTableName(): string
    {
        return 'vendor_module_items';
    }

    public static function getMap(): array
    {
        return [
            (new Fields\IntegerField('ID'))
                ->configurePrimary(true)
                ->configureAutocomplete(true),

            (new Fields\StringField('NAME'))
                ->configureRequired(true)
                ->addValidator(new Fields\Validators\LengthValidator(1, 255)),

            // ... другие поля
        ];
    }
}
```

### 3. Типы полей

Используй правильный тип поля из `Bitrix\Main\ORM\Fields\`:

| Тип | Класс | PHP-тип |
|-----|-------|---------|
| Целое число | `IntegerField` | `int` |
| Дробное число | `FloatField` | `float` |
| Строка | `StringField` | `string` |
| Текст | `TextField` | `string` |
| Дата | `DateField` | `Date` |
| Дата+время | `DatetimeField` | `DateTime` |
| Булево | `BooleanField` | `string` (Y/N) |
| Enum | `EnumField` | `string` |
| Вычисляемое | `ExpressionField` | зависит от выражения |

### 4. Связи (Relations)

```php
// Один-к-одному / Много-к-одному (Reference)
(new Fields\Relations\Reference(
    'AUTHOR',
    \Bitrix\Main\UserTable::class,
    ['=this.AUTHOR_ID' => 'ref.ID']
))

// Один-ко-многим (OneToMany)
(new Fields\Relations\OneToMany('COMMENTS', CommentTable::class, 'ITEM'))

// Многие-ко-многим (ManyToMany)
(new Fields\Relations\ManyToMany('TAGS', TagTable::class)
    ->configureMediatorTableName('vendor_module_item_tags')
    ->configureLocalPrimary('ID')
    ->configureLocalReference('ITEM_ID')
    ->configureRemotePrimary('ID')
    ->configureRemoteReference('TAG_ID'))
```

### 5. Проверь

- Имя таблицы уникально и с префиксом вендора
- Primary key определён
- Required-поля отмечены
- Валидаторы добавлены для строковых полей
- Связи используют правильные join-условия

### 6. CRUD-операции

После создания сущности она поддерживает:
- `::getList($params)` — выборка
- `::getById($id)` — по ID
- `::add($data)` — создание (→ AddResult)
- `::update($id, $data)` — обновление (→ UpdateResult)
- `::delete($id)` — удаление (→ DeleteResult)

Всегда проверяй `$result->isSuccess()` у результатов мутаций.

Для полной справки по типам полей, связям и запросам смотри [reference.md](reference.md).
