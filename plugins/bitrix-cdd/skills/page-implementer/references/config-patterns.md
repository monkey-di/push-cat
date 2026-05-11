# Паттерны конфигов инфоблоков

## Структура конфига

Каждый конфиг — PHP-файл в `local/config/iblocks/`, возвращающий массив.

## Типы инфоблоков

### Страничный singleton (тип `pages`)
Один элемент — одна страница. Содержит все редактируемые поля секций страницы.

```php
<?php
return [
    'version' => '1.0',
    'need_sync' => true,
    'strict' => false,
    'priority' => 1000,

    'iblock' => [
        'code' => 'about_page',
        'type' => 'pages',
        'name' => 'Страница "О фонде"',
        'sort' => 100,
    ],

    'field_validation' => [
        'NAME' => ['max_length' => 160, 'label' => 'Название страницы'],
    ],

    'fields' => [
        'ID' => ['type' => 'standard'],
        'NAME' => ['type' => 'standard'],
        'CODE' => ['type' => 'standard'],
        // Секция "Intro"
        'INTRO_TITLE' => ['type' => 'property', 'property_type' => 'string'],
        'INTRO_TEXT' => ['type' => 'property', 'property_type' => 'text'],
        'INTRO_IMAGE' => ['type' => 'property', 'property_type' => 'file'],
        // Секция с привязкой к связанному инфоблоку
        'AMBASSADORS_TITLE' => ['type' => 'property', 'property_type' => 'string'],
        'AMBASSADORS_DESC' => ['type' => 'property', 'property_type' => 'text'],
        // Видимость секции
        'PARTNERS_SHOW' => ['type' => 'property', 'property_type' => 'enum'],
    ],

    'properties' => [
        'INTRO_TITLE' => [
            'name' => 'Заголовок секции "Intro"',
            'type' => 'S',
            'sort' => 100,
        ],
        'INTRO_TEXT' => [
            'name' => 'Текст секции "Intro"',
            'type' => 'S',
            'user_type' => 'HTML',
            'sort' => 110,
        ],
        'INTRO_IMAGE' => [
            'name' => 'Изображение секции "Intro" (JPG, PNG, WEBP)',
            'type' => 'F',
            'file_type' => 'jpg, jpeg, png, webp',
            'sort' => 120,
        ],
        'AMBASSADORS_TITLE' => [
            'name' => 'Заголовок блока амбассадоров',
            'type' => 'S',
            'sort' => 200,
        ],
        'AMBASSADORS_DESC' => [
            'name' => 'Описание блока амбассадоров',
            'type' => 'S',
            'user_type' => 'HTML',
            'sort' => 210,
        ],
        'PARTNERS_SHOW' => [
            'name' => 'Отображать блок партнёров',
            'type' => 'L',
            'sort' => 300,
            'VALUES' => [
                ['VALUE' => 'Да', 'SORT' => 10, 'DEF' => 'Y'],
                ['VALUE' => 'Нет', 'SORT' => 20],
            ],
        ],
    ],

    'demo_data' => [
        [
            'code' => 'about-page',
            'name' => 'Страница "О фонде"',
            'active' => 'Y',
            'sort' => 100,
            'properties' => [
                'INTRO_TITLE' => 'О фонде',
                'INTRO_TEXT' => '<p>Описание фонда...</p>',
                'INTRO_IMAGE' => '/local/assets/img/dest/about-intro.jpg',
                'AMBASSADORS_TITLE' => 'Наши амбассадоры',
                'AMBASSADORS_DESC' => '<p>Описание секции амбассадоров...</p>',
                'PARTNERS_SHOW' => 'Да',
            ],
        ],
    ],
];
```

### Списковый инфоблок (тип `content`)
Множество элементов — карточки, записи, элементы списка.

```php
<?php
return [
    'version' => '1.0',
    'need_sync' => true,
    'strict' => false,
    'priority' => 900,

    'iblock' => [
        'code' => 'ambassadors',
        'type' => 'content',
        'name' => 'Амбассадоры',
        'sort' => 400,
    ],

    'fields' => [
        'ID' => ['type' => 'standard'],
        'NAME' => ['type' => 'standard'],
        'CODE' => ['type' => 'standard'],
        'SORT' => ['type' => 'standard'],
        'PHOTO' => ['type' => 'property', 'property_type' => 'file'],
        'POSITION' => ['type' => 'property', 'property_type' => 'string'],
        'QUOTE' => ['type' => 'property', 'property_type' => 'text'],
    ],

    'properties' => [
        'PHOTO' => [
            'name' => 'Фотография (JPG, PNG, WEBP)',
            'type' => 'F',
            'file_type' => 'jpg, jpeg, png, webp',
            'sort' => 100,
        ],
        'POSITION' => [
            'name' => 'Должность/Звание',
            'type' => 'S',
            'sort' => 200,
        ],
        'QUOTE' => [
            'name' => 'Цитата',
            'type' => 'S',
            'user_type' => 'HTML',
            'sort' => 300,
        ],
    ],

    'demo_data' => [
        [
            'code' => 'ambassador-1',
            'name' => 'Нурсина Галиева',
            'active' => 'Y',
            'sort' => 100,
            'properties' => [
                'PHOTO' => '/local/assets/img/dest/ambasador1.jpg',
                'POSITION' => 'Чемпионка России по танцам на колясках',
                'QUOTE' => '<p>Текст цитаты...</p>',
            ],
        ],
        [
            'code' => 'ambassador-2',
            'name' => 'Имя Фамилия',
            'active' => 'Y',
            'sort' => 200,
            'properties' => [
                'PHOTO' => '/local/assets/img/dest/ambasador2.jpg',
                'POSITION' => 'Должность',
                'QUOTE' => '<p>Текст цитаты...</p>',
            ],
        ],
    ],
];
```

## Правила типов полей

### В секции `properties` (определение свойства Bitrix)

| Данные | type | Доп. параметры |
|--------|------|---------------|
| Строка | `'S'` | — |
| HTML-текст | `'S'` | `'user_type' => 'HTML'` |
| Файл | `'F'` | `'file_type' => 'jpg, jpeg, png, webp'` |
| Список | `'L'` | `'VALUES' => [['VALUE' => '...', 'SORT' => 10]]` |
| Привязка к элементу | `'E'` | `'link_iblock_id' => 'code_инфоблока'` |
| Множественное | любой | `'multiple' => true` |

### В секции `fields` (маппинг для ElementDataExtractor)

| property_type | Когда использовать | Что возвращает |
|---------------|-------------------|----------------|
| `'string'` | type: 'S' без user_type | строку |
| `'text'` | type: 'S' с user_type: 'HTML' | строку из ['TEXT'] |
| `'file'` | type: 'F' | путь к файлу или массив путей |
| `'enum'` | type: 'L' | текстовое значение |
| `'element'` | type: 'E' | int ID элемента |

**КРИТИЧНО**: ВСЕГДА используй `'text'` для HTML-свойств, ВСЕГДА `'enum'` для list-свойств.

## Правила demo_data

- **КРИТИЧНО: Demo data ДОЛЖНА точно воспроизводить ВСЕ элементы из HTML-вёрстки.** Не сокращай, не придумывай свой текст. Копируй заголовки, тексты, количество элементов 1:1 из `app/pages/*.html`. Если в вёрстке 11 карточек — в demo_data 11 элементов с точными заголовками и текстами.
- Файлы: путь `/local/assets/img/dest/файл.jpg` — файл должен существовать
- HTML-свойства: передавать plain HTML строкой — PropertyValueConverter обернёт
- Enum: передавать текстовое значение (например, `'Да'`, не ID)
- Привязка к элементу (type E): передавать CODE элемента строкой
- НЕ используй `required: true` без явного указания в ТЗ

## Правила версионирования

- Новый конфиг: `'version' => '1.0'`
- Обновление: инкремент версии (1.0 → 1.1, 1.8 → 1.9)
- `'need_sync' => true` — синхронизировать структуру
- `'strict' => false` — не удалять данные вне конфига (по умолчанию)

## Priority

- Связанные инфоблоки (без зависимостей): `priority => 900`
- Основные инфоблоки (со связями): `priority => 1000`
- Чем ниже число, тем раньше создаётся (важно для link_iblock_id)
