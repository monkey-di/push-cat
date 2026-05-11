# Паттерны компонентов Bitrix

## Структура файлов компонента

```
local/components/custom/{name}/
├── component.php                          # Логика
└── templates/.default/template.php        # Шаблон
```

## Паттерн 1: Секция из singleton-инфоблока

Секция страницы, данные берутся из страничного singleton-элемента.

### component.php
```php
<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();
use BitrixCdd\Core\Application;

$app = Application::getInstance();
$extractor = $app->getService('iblock.data_extractor');

// Данные из страничного синглтона
$elements = $extractor->getElements('about_page', ['CODE' => 'about-page']);
$data = !empty($elements) ? $elements[0] : [];

// Заполняем arResult из данных инфоблока с fallback
$arResult['TITLE'] = $data['INTRO_TITLE'] ?? 'О фонде';
$arResult['TEXT'] = $data['INTRO_TEXT'] ?? '<p>Описание по умолчанию</p>';
$arResult['IMAGE'] = $data['INTRO_IMAGE'] ?? '/local/assets/img/dest/about-intro.jpg';

// Также принимаем параметры от родительской страницы
if (!empty($arParams['TITLE'])) {
    $arResult['TITLE'] = $arParams['TITLE'];
}

$this->IncludeComponentTemplate();
```

### template.php
```php
<?php if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die(); ?>
<section class="about-intro">
    <div class="container">
        <div class="row">
            <div class="col-md-6">
                <div class="title"><h2><?= htmlspecialchars($arResult['TITLE']) ?></h2></div>
                <div class="text"><?= $arResult['TEXT'] ?></div>
            </div>
            <div class="col-md-6">
                <div class="img">
                    <img src="<?= htmlspecialchars($arResult['IMAGE']) ?>" alt="">
                </div>
            </div>
        </div>
    </div>
</section>
```

## Паттерн 2: Список из content-инфоблока

Карточки/элементы из спискового инфоблока.

### component.php
```php
<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();
use BitrixCdd\Core\Application;

$app = Application::getInstance();
$extractor = $app->getService('iblock.data_extractor');

$arResult['TITLE'] = $arParams['TITLE'] ?? 'Наши амбассадоры';
$arResult['DESCRIPTION'] = $arParams['DESCRIPTION'] ?? '';

$filter = ['ACTIVE' => 'Y'];
$arResult['ITEMS'] = $extractor->getElements('ambassadors', $filter);

// Fallback для пустой БД
if (empty($arResult['ITEMS'])) {
    $arResult['ITEMS'] = [
        [
            'NAME' => 'Имя Фамилия',
            'PHOTO' => '/local/assets/img/dest/ambasador1.jpg',
            'POSITION' => 'Должность',
            'QUOTE' => '<p>Цитата...</p>',
        ],
    ];
}

$this->IncludeComponentTemplate();
```

### template.php
```php
<?php if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die(); ?>
<section class="ambassadors">
    <div class="container">
        <div class="title"><h3><?= htmlspecialchars($arResult['TITLE']) ?></h3></div>
        <?php if (!empty($arResult['DESCRIPTION'])): ?>
            <div class="after-title h5"><?= $arResult['DESCRIPTION'] ?></div>
        <?php endif; ?>
        <div class="slider-block">
            <div class="swiper-wrapper">
                <?php foreach ($arResult['ITEMS'] as $item): ?>
                    <div class="swiper-slide">
                        <div class="img">
                            <img src="<?= htmlspecialchars($item['PHOTO']) ?>" alt="">
                        </div>
                        <div class="name h4"><?= htmlspecialchars($item['NAME']) ?></div>
                        <div class="job"><?= htmlspecialchars($item['POSITION']) ?></div>
                        <div class="text"><?= $item['QUOTE'] ?></div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
</section>
```

## Паттерн 3: Список с пагинацией

### component.php
```php
<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();
use BitrixCdd\Core\Application;

$app = Application::getInstance();
$extractor = $app->getService('iblock.data_extractor');

$allItems = $extractor->getElements('news', ['ACTIVE' => 'Y']);

// Пагинация
$pageSize = intval($arParams['PAGE_SIZE'] ?? 12);
$currentPage = intval($_GET['PAGEN_1'] ?? 1);
if ($currentPage < 1) $currentPage = 1;
$totalPages = max(1, ceil(count($allItems) / $pageSize));
$offset = ($currentPage - 1) * $pageSize;

$arResult['ITEMS'] = array_slice($allItems, $offset, $pageSize);
$arResult['NAV'] = [
    'CURRENT_PAGE' => $currentPage,
    'TOTAL_PAGES' => $totalPages,
    'HAS_PREV' => $currentPage > 1,
    'HAS_NEXT' => $currentPage < $totalPages,
];

if (empty($arResult['ITEMS'])) {
    $arResult['ITEMS'] = [
        ['NAME' => 'Заголовок', 'PREVIEW_PICTURE' => '/local/assets/img/dest/placeholder.jpg'],
    ];
}

$this->IncludeComponentTemplate();
```

## Паттерн 4: Детальная страница

### component.php
```php
<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();
use BitrixCdd\Core\Application;

$app = Application::getInstance();
$extractor = $app->getService('iblock.data_extractor');

$elementCode = $arParams['ELEMENT_CODE'] ?? '';
$elementId = $arParams['ELEMENT_ID'] ?? '';

$filter = ['ACTIVE' => 'Y'];
if (!empty($elementCode)) {
    $filter['CODE'] = $elementCode;
} elseif (!empty($elementId)) {
    $filter['ID'] = $elementId;
}

$items = $extractor->getElements('projects', $filter);
if (empty($items)) {
    ShowError('Элемент не найден');
    return;
}

$arResult = $items[0];
$this->IncludeComponentTemplate();
```

## Паттерн 5: Wrapper-компонент (сборщик секций)

Используется когда страница — это набор секций, каждая из которых — отдельный компонент.

### component.php
```php
<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();
$this->IncludeComponentTemplate();
```

### template.php
```php
<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();
global $APPLICATION;
?>
<?php $APPLICATION->IncludeComponent("custom:about.intro", "", []); ?>
<?php $APPLICATION->IncludeComponent("custom:about.values", "", []); ?>
<?php $APPLICATION->IncludeComponent("custom:about.ambassadors", "", []); ?>
```

## КРИТИЧНО: Обёртка `<main>`

Шаблон компонента-страницы **ОБЯЗАН** содержать тег `<main>` с CSS-классами из вёрстки. Класс `<main>` определяется из HTML-файла в `app/pages/`:

```php
<?php if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die(); ?>
<main class="inner-page faq-page">
<section class="faq">
    <!-- содержимое -->
</section>
</main>
```

Без `<main>` стили страницы не применятся. Всегда проверяй `<main class="...">` в исходном HTML.

## Правила шаблонов

### Экранирование
- `htmlspecialchars()` — для ВСЕХ строковых значений (NAME, заголовки, URL, alt)
- БЕЗ экранирования — для HTML-полей (property_type: 'text'), они уже содержат HTML
- `htmlspecialchars()` — для src/href атрибутов (путей к файлам)

### HTML из вёрстки
- CSS-классы секций сохраняются из вёрстки без изменений
- SVG-иконки копируются из вёрстки как есть
- Структура div/section/container сохраняется
- Статические тексты заменяются на `$arResult['FIELD']`
- Повторяющиеся блоки оборачиваются в `foreach`

### Условный вывод
```php
<?php if (!empty($arResult['FIELD'])): ?>
    <div class="block"><?= $arResult['FIELD'] ?></div>
<?php endif; ?>
```

### Embed видео RUTUBE
RUTUBE блокирует прямые ссылки в iframe (`X-Frame-Options: sameorigin`). Нужно конвертировать:
- `https://rutube.ru/video/{id}/` → `https://rutube.ru/play/embed/{id}`

```php
$embedUrl = $videoUrl;
if (preg_match('#rutube\.ru/video/([a-f0-9]+)#i', $videoUrl, $m)) {
    $embedUrl = 'https://rutube.ru/play/embed/' . $m[1];
}
```

### Видимость секции через enum
```php
<?php if (($arResult['SECTION_SHOW'] ?? 'Да') === 'Да'): ?>
    <section class="section-name">...</section>
<?php endif; ?>
```
