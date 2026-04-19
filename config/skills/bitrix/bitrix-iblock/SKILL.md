---
name: bitrix-iblock
description: >
  Bitrix Iblock expert. ALWAYS invoke this skill when the user asks about iblocks, iblock elements, sections, iblock properties, Iblock\Elements API, CIBlockElement, or iblock CRUD operations.
  Do not write iblock queries or manipulate iblock data directly -- use this skill first.
argument-hint: [action]
---

# Bitrix D7 InfoBlocks — Работа с инфоблоками

Выполни действие `$ARGUMENTS` с инфоблоками через D7 API.

Перед началом работы обязательно:
```php
use Bitrix\Main\Loader;
Loader::requireModule('iblock');
```

## Ключевые концепции D7 InfoBlocks

### API-код инфоблока

API-код — символьный код, задаваемый в настройках инфоблока (поле `API_CODE`). Используется для генерации ORM-класса.

Если API-код инфоблока = `News`, то ORM-класс: `Bitrix\Iblock\Elements\ElementNewsTable`

### Работа с элементами (D7 ORM)

```php
use Bitrix\Iblock\Elements\ElementNewsTable;

// Выборка элементов
$elements = ElementNewsTable::getList([
    'select' => ['ID', 'NAME', 'DETAIL_TEXT', 'AUTHOR_NAME' => 'PROPERTY_AUTHOR.VALUE'],
    'filter' => ['=ACTIVE' => 'Y'],
    'order' => ['SORT' => 'ASC'],
    'limit' => 10,
])->fetchAll();
```

### Работа со свойствами

Свойства доступны через ORM с префиксом по их символьному коду:

```php
// Скалярное свойство PRICE → поле PRICE.VALUE
$items = ElementCatalogTable::getList([
    'select' => ['ID', 'NAME', 'PRICE_VALUE' => 'PRICE.VALUE'],
    'filter' => ['>PRICE.VALUE' => 100],
]);

// Привязка к элементам (тип E) → LINKED_ITEMS.VALUE (ID связанного элемента)
// Привязка к разделам (тип G) → SECTION_LINK.VALUE

// Множественные свойства (select через специальный синтаксис)
$items = ElementCatalogTable::getList([
    'select' => ['ID', 'NAME', 'TAGS_MULTI' => 'TAGS.VALUE'],
]);
```

### CRUD

```php
// Создание элемента
$result = ElementNewsTable::createObject()
    ->setName('Новая новость')
    ->setActive(true)
    ->setSort(500)
    ->setIblockSectionId($sectionId)
    ->save();

if (!$result->isSuccess()) {
    // обработка ошибок
}

// Обновление
$element = ElementNewsTable::getByPrimary($id)->fetchObject();
$element->setName('Обновлённое название');
$result = $element->save();

// Удаление
$result = ElementNewsTable::delete($id);
```

## Инструкции

1. Определи, с каким инфоблоком работаем (по API-коду)
2. Используй соответствующий ORM-класс `ElementXxxTable`
3. Для свойств — обращайся через символьные коды (не ID)
4. Всегда проверяй Result после мутаций
5. Используй кеширование для read-операций в компонентах

Для полной справки по свойствам, секциям и миграции смотри [reference.md](reference.md).
