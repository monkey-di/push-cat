---
name: bitrix-component
description: >
  Bitrix Component expert. ALWAYS invoke this skill when the user asks about creating Bitrix components, CBitrixComponent, component class.php, component templates, .parameters.php, or component refactoring.
  Do not create or modify Bitrix components directly -- use this skill first.
argument-hint: [component-name]
---

# Bitrix D7 — Создание/модификация компонента

Создай или модифицируй компонент `$ARGUMENTS`.

## Процесс

### 1. Определи структуру каталогов

Компонент размещается в `/local/components/<vendor>/<component.name>/`:

```
local/components/vendor/component.name/
├── class.php              # Логика компонента (обязателен для D7)
├── .description.php       # Описание для админки
├── .parameters.php        # Параметры компонента
├── templates/
│   └── .default/
│       ├── template.php   # Шаблон
│       ├── style.css      # Стили
│       ├── script.js      # Скрипты
│       └── result_modifier.php  # (опционально) модификатор результата
└── lang/
    └── ru/
        ├── class.php
        └── .parameters.php
```

### 2. Создай class.php (основной файл)

```php
<?php

use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

class VendorComponentNameComponent extends CBitrixComponent
{
    /** @var array Обязательные модули */
    private const REQUIRED_MODULES = ['iblock'];

    public function executeComponent(): void
    {
        $this->loadModules();
        $this->processParams();

        if ($this->startResultCache()) {
            $this->fetchData();

            if (empty($this->arResult['ITEMS'])) {
                $this->abortResultCache();
            }

            $this->includeComponentTemplate();
        }
    }

    private function loadModules(): void
    {
        foreach (self::REQUIRED_MODULES as $module) {
            Loader::requireModule($module);
        }
    }

    private function processParams(): void
    {
        $this->arParams['IBLOCK_ID'] = (int)($this->arParams['IBLOCK_ID'] ?? 0);
        $this->arParams['ELEMENTS_COUNT'] = (int)($this->arParams['ELEMENTS_COUNT'] ?? 10);
        $this->arParams['CACHE_TIME'] = (int)($this->arParams['CACHE_TIME'] ?? 3600);
    }

    private function fetchData(): void
    {
        // Заполнение $this->arResult
        $this->arResult['ITEMS'] = [];
    }
}
```

### 3. Шаблон (template.php)

```php
<?php if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();
/** @var array $arResult */
/** @var array $arParams */
?>
<div class="vendor-component">
    <?php foreach ($arResult['ITEMS'] as $item): ?>
        <div class="vendor-component__item">
            <!-- Только отображение, БЕЗ бизнес-логики -->
        </div>
    <?php endforeach; ?>
</div>
```

### 4. Параметры (.parameters.php)

```php
<?php
use Bitrix\Main\Localization\Loc;

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

$arComponentParameters = [
    'GROUPS' => [],
    'PARAMETERS' => [
        'IBLOCK_ID' => [
            'PARENT' => 'BASE',
            'NAME' => Loc::getMessage('VENDOR_COMPONENT_IBLOCK_ID'),
            'TYPE' => 'STRING',
        ],
        'ELEMENTS_COUNT' => [
            'PARENT' => 'BASE',
            'NAME' => Loc::getMessage('VENDOR_COMPONENT_ELEMENTS_COUNT'),
            'TYPE' => 'STRING',
            'DEFAULT' => '10',
        ],
        'CACHE_TIME' => ['DEFAULT' => '3600'],
    ],
];
```

### 5. Описание (.description.php)

```php
<?php
use Bitrix\Main\Localization\Loc;

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

$arComponentDescription = [
    'NAME' => Loc::getMessage('VENDOR_COMPONENT_NAME'),
    'DESCRIPTION' => Loc::getMessage('VENDOR_COMPONENT_DESC'),
    'PATH' => [
        'ID' => 'vendor',
        'NAME' => 'Vendor',
    ],
    'CACHE_PATH' => 'Y',
];
```

### 6. Проверь

- Проверка `B_PROLOG_INCLUDED` в каждом PHP-файле
- Модули загружены через `Loader::requireModule()`
- Параметры приведены к нужным типам в `processParams()`
- Кеширование через `startResultCache()` / `abortResultCache()`
- В шаблоне — только вывод, вся логика в `class.php`
- Локализация в `lang/ru/`

Для полной справки по кешированию, ajax, ЧПУ и наследованию смотри [reference.md](reference.md).
