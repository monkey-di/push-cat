# Паттерны сборки Bitrix-страниц

## Базовая структура страницы

```php
<?php
require($_SERVER["DOCUMENT_ROOT"]."/bitrix/header.php");

use BitrixCdd\Core\Application;
$app = Application::getInstance();
$extractor = $app->getService('iblock.data_extractor');

// Получаем данные singleton-элемента страницы
$pageContent = $extractor->getElements('about_page', ['CODE' => 'about-page']);
$pageData = !empty($pageContent) ? $pageContent[0] : [];

// Мета-данные страницы
$APPLICATION->SetTitle("О фонде");
$APPLICATION->SetPageProperty("body_class", "inner-page about-page");
SeoHelper::setFromElement('about_page', (int)($pageData['ID'] ?? 0), $pageData);
?>

<?php $APPLICATION->IncludeComponent("custom:about.page", "", []); ?>

<?php require($_SERVER["DOCUMENT_ROOT"]."/bitrix/footer.php"); ?>
```

## Варианты сборки

### Вариант 1: Wrapper-компонент
Страница включает один wrapper-компонент, который внутри подключает секции.

```php
<?php $APPLICATION->IncludeComponent("custom:about.page", "", []); ?>
```

Используется когда: секции страницы не нуждаются в данных из page-singleton на уровне страницы.

### Вариант 2: Прямое включение компонентов с параметрами
Страница сама включает компоненты, передавая им данные из page-singleton.

```php
<?php
$APPLICATION->IncludeComponent("custom:hero.main", "", [
    'TITLE' => $pageData['HERO_TITLE'] ?? 'Заголовок по умолчанию',
    'BTN_TEXT' => $pageData['HERO_BTN_TEXT'] ?? 'Подробнее',
    'BTN_LINK' => $pageData['HERO_BTN_LINK'] ?? '#',
]);
?>

<?php
$APPLICATION->IncludeComponent("custom:projects.list", "", [
    'TITLE' => $pageData['PROJECTS_TITLE'] ?? 'Наши проекты',
    'PAGE_SIZE' => 12,
]);
?>
```

Используется когда: разные секции получают данные из одного page-singleton.

### Вариант 3: Комбинированный
Часть компонентов через wrapper, часть напрямую.

```php
<main class="inner-page cooperation-page">
    <?php $APPLICATION->IncludeComponent("custom:cooperation.intro", "", [
        'TITLE' => $pageData['INTRO_TITLE'] ?? 'Сотрудничество',
    ]); ?>
    <?php $APPLICATION->IncludeComponent("custom:cooperation.types", "", []); ?>
    <?php $APPLICATION->IncludeComponent("custom:cooperation.form", "", []); ?>
</main>
```

## Структура директорий

Страницы размещаются по URL-структуре сайта:

```
/index.php                     → Главная
/about/index.php               → О фонде
/projects/index.php            → Проекты (список)
/projects/detail.php           → Проект (детальная)
/media/index.php               → Медиа
/cooperation/index.php         → Сотрудничество
/faq/index.php                 → FAQ
/fundraisings/index.php        → Сборы (список)
/fundraisings/detail.php       → Сбор (детальная)
```

## Детальные страницы

```php
<?php
require($_SERVER["DOCUMENT_ROOT"]."/bitrix/header.php");

use BitrixCdd\Core\Application;
$app = Application::getInstance();

$elementCode = $_REQUEST['CODE'] ?? '';
$elementId = $_REQUEST['ID'] ?? '';

$APPLICATION->SetTitle("Проект");
$APPLICATION->SetPageProperty("body_class", "inner-page project-detail-page");
?>

<?php $APPLICATION->IncludeComponent("custom:project.detail", "", [
    'ELEMENT_CODE' => $elementCode,
    'ELEMENT_ID' => $elementId,
]); ?>

<?php require($_SERVER["DOCUMENT_ROOT"]."/bitrix/footer.php"); ?>
```

## Правила body_class

- Главная: `"main-page"`
- Внутренние: `"inner-page {section}-page"` (например, `"inner-page about-page"`)
- Детальные: `"inner-page {section}-detail-page"`
- Берётся из CSS-классов `<main>` в HTML-вёрстке

## Обязательные элементы

Каждая страница ДОЛЖНА содержать:
1. `require("bitrix/header.php")` — в начале
2. `require("bitrix/footer.php")` — в конце
3. `$APPLICATION->SetTitle()` — заголовок
4. `$APPLICATION->SetPageProperty("body_class", "...")` — CSS-класс body

## SeoHelper

Если инфоблок поддерживает SEO:
```php
SeoHelper::setFromElement('iblock_code', (int)($pageData['ID'] ?? 0), $pageData);
```

Используется для страничных singleton-инфоблоков. Устанавливает title, description, og-теги.
