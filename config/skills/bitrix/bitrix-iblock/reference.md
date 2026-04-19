# Bitrix D7 InfoBlocks — Полная справка

## ORM-классы инфоблоков

### Элементы

Класс генерируется на основе API-кода инфоблока:

| API-код | ORM-класс |
|---------|-----------|
| `News` | `Bitrix\Iblock\Elements\ElementNewsTable` |
| `Catalog` | `Bitrix\Iblock\Elements\ElementCatalogTable` |
| `Services` | `Bitrix\Iblock\Elements\ElementServicesTable` |

### Базовые поля элементов

| Поле | Тип | Описание |
|------|-----|---------|
| `ID` | int | Первичный ключ |
| `NAME` | string | Название |
| `CODE` | string | Символьный код |
| `XML_ID` | string | Внешний код |
| `ACTIVE` | bool (Y/N) | Активность |
| `SORT` | int | Сортировка |
| `PREVIEW_TEXT` | text | Анонс |
| `PREVIEW_TEXT_TYPE` | string | Тип анонса (text/html) |
| `PREVIEW_PICTURE` | int | ID файла анонсовой картинки |
| `DETAIL_TEXT` | text | Детальное описание |
| `DETAIL_TEXT_TYPE` | string | Тип описания |
| `DETAIL_PICTURE` | int | ID файла детальной картинки |
| `DATE_CREATE` | datetime | Дата создания |
| `TIMESTAMP_X` | datetime | Дата изменения |
| `CREATED_BY` | int | Кто создал |
| `MODIFIED_BY` | int | Кто изменил |
| `IBLOCK_SECTION_ID` | int | Основной раздел |
| `ACTIVE_FROM` | datetime | Начало активности |
| `ACTIVE_TO` | datetime | Конец активности |

## Свойства инфоблоков в ORM

### Типы свойств и их обращение

| Тип свойства | Символьный код | Обращение в select | Значение |
|--------------|---------------|-------------------|----------|
| Строка (S) | `AUTHOR` | `AUTHOR.VALUE` | string |
| Число (N) | `PRICE` | `PRICE.VALUE` | number |
| Список (L) | `COLOR` | `COLOR.ITEM` | EnumElement object |
| Привязка к элементам (E) | `LINKED` | `LINKED.VALUE` | int (ID элемента) |
| Привязка к разделам (G) | `SECTION_LINK` | `SECTION_LINK.VALUE` | int (ID раздела) |
| Файл (F) | `PHOTO` | `PHOTO.VALUE` | int (ID файла) |
| Дата (S:DateTime) | `EVENT_DATE` | `EVENT_DATE.VALUE` | DateTime |
| HTML/текст (S:HTML) | `CONTENT` | `CONTENT.VALUE` | array (`['TEXT'=>..., 'TYPE'=>...]`) |
| Справочник (S:directory) | `BRAND` | `BRAND.VALUE` | string (XML_ID значения) |

### Выборка со свойствами

```php
use Bitrix\Iblock\Elements\ElementCatalogTable;

// Скалярные свойства
$items = ElementCatalogTable::getList([
    'select' => [
        'ID',
        'NAME',
        'PRICE_VALUE' => 'PRICE.VALUE',
        'BRAND_VALUE' => 'BRAND.VALUE',
    ],
    'filter' => [
        '=ACTIVE' => 'Y',
        '>PRICE.VALUE' => 0,
    ],
])->fetchAll();

// Свойство типа "Список" — получение значения
$items = ElementCatalogTable::getList([
    'select' => [
        'ID',
        'NAME',
        'COLOR_ITEM' => 'COLOR.ITEM',
    ],
]);
foreach ($items as $item) {
    $colorValue = $item->get('COLOR_ITEM')?->getValue(); // значение enum
    $colorXmlId = $item->get('COLOR_ITEM')?->getXmlId(); // XML_ID enum
}

// Привязка к элементам — получение данных связанного элемента
$items = ElementCatalogTable::getList([
    'select' => [
        'ID',
        'NAME',
        'LINKED_ELEMENT_NAME' => 'LINKED.ITEM.NAME', // имя связанного элемента
    ],
]);
```

### Множественные свойства

```php
// Множественные свойства в select
$items = ElementCatalogTable::getList([
    'select' => ['ID', 'NAME', 'TAGS_COLLECTION' => 'TAGS'],
])->fetchCollection();

foreach ($items as $item) {
    $tags = $item->getTags();
    foreach ($tags->getAll() as $tag) {
        echo $tag->getValue();
    }
}
```

### Установка значений свойств

```php
// Создание с указанием свойств
$object = ElementCatalogTable::createObject();
$object->setName('Товар');
$object->setActive(true);

// Скалярное свойство
$object->setPrice(1500.00);  // если свойство PRICE

// Множественное свойство
$object->addToTags(
    \Bitrix\Iblock\Elements\PropertyValueTable::createObject()
        ->setValue('tag1')
);

$result = $object->save();
```

## Секции (разделы)

```php
use Bitrix\Iblock\SectionTable;

// Выборка секций
$sections = SectionTable::getList([
    'select' => ['ID', 'NAME', 'CODE', 'DEPTH_LEVEL', 'LEFT_MARGIN', 'RIGHT_MARGIN'],
    'filter' => [
        '=IBLOCK_ID' => $iblockId,
        '=ACTIVE' => 'Y',
    ],
    'order' => ['LEFT_MARGIN' => 'ASC'],
])->fetchAll();

// Элементы в секции (включая подсекции)
$elements = ElementCatalogTable::getList([
    'filter' => [
        '=IBLOCK_SECTION_ID' => $sectionId,
        // Или для вложенных секций:
        // 'IBLOCK_SECTION.LEFT_MARGIN' => ['>=', $section['LEFT_MARGIN']],
        // 'IBLOCK_SECTION.RIGHT_MARGIN' => ['<=', $section['RIGHT_MARGIN']],
    ],
]);

// CRUD секций
$result = SectionTable::add([
    'IBLOCK_ID' => $iblockId,
    'NAME' => 'Новый раздел',
    'CODE' => 'new-section',
    'ACTIVE' => 'Y',
    'SORT' => 500,
]);
```

## Типы инфоблоков

```php
use Bitrix\Iblock\TypeTable;

// Получить все типы
$types = TypeTable::getList([
    'select' => ['ID', 'SORT'],
])->fetchAll();

// С языкозависимыми данными
$types = TypeTable::getList([
    'select' => ['ID', 'LANG_MESSAGE.NAME'],
    'filter' => ['=LANG_MESSAGE.LANGUAGE_ID' => LANGUAGE_ID],
])->fetchAll();
```

## Метаданные инфоблоков

```php
use Bitrix\Iblock\IblockTable;
use Bitrix\Iblock\PropertyTable;

// Получить инфоблок по API-коду
$iblock = IblockTable::getRow([
    'filter' => ['=API_CODE' => 'News'],
    'select' => ['ID', 'NAME', 'API_CODE', 'CODE'],
]);

// Свойства инфоблока
$properties = PropertyTable::getList([
    'filter' => ['=IBLOCK_ID' => $iblock['ID']],
    'select' => ['ID', 'NAME', 'CODE', 'PROPERTY_TYPE', 'MULTIPLE', 'IS_REQUIRED'],
])->fetchAll();
```

## Получение ID инфоблока по символьному коду

```php
// Через ORM (рекомендуется)
$iblock = IblockTable::getRow([
    'filter' => ['=CODE' => 'news', '=IBLOCK_TYPE_ID' => 'content'],
    'select' => ['ID'],
    'cache' => ['ttl' => 86400],
]);
$iblockId = $iblock['ID'];
```

## Фасетный индекс

```php
use Bitrix\Iblock\PropertyIndex\Manager;

// Создание фасетного индекса для инфоблока
Manager::createByIblock($iblockId);

// Проверка актуальности
if (!Manager::checkByIblock($iblockId)) {
    Manager::createByIblock($iblockId);
}
```
