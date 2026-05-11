# Bitrix D7 Module — Полная справка

## Автозагрузка классов

### Через include.php (явная регистрация)

```php
Loader::registerAutoLoadClasses('vendor.modulename', [
    'Vendor\\ModuleName\\ItemTable' => 'lib/itemtable.php',
    'Vendor\\ModuleName\\Service\\ItemService' => 'lib/service/itemservice.php',
]);
```

### Автоматическая автозагрузка D7

D7 автоматически ищет классы по конвенции:
- `Vendor\ModuleName\SomeClass` → `local/modules/vendor.modulename/lib/someclass.php`
- `Vendor\ModuleName\Sub\Dir\Class` → `local/modules/vendor.modulename/lib/sub/dir/class.php`

Регистрация в `include.php` нужна для обратной совместимости и явности.

## Регистрация событий в установщике

```php
public function InstallEvents(): void
{
    $eventManager = \Bitrix\Main\EventManager::getInstance();

    $eventManager->registerEventHandlerCompatible(
        'iblock',                                    // Модуль-источник
        'OnAfterIBlockElementAdd',                   // Событие
        $this->MODULE_ID,                            // Ваш модуль
        'Vendor\\ModuleName\\EventHandler',          // Класс
        'onAfterElementAdd'                          // Метод
    );
}

public function UnInstallEvents(): void
{
    $eventManager = \Bitrix\Main\EventManager::getInstance();

    $eventManager->unRegisterEventHandler(
        'iblock',
        'OnAfterIBlockElementAdd',
        $this->MODULE_ID,
        'Vendor\\ModuleName\\EventHandler',
        'onAfterElementAdd'
    );
}
```

## Регистрация агентов в установщике

```php
public function InstallAgents(): void
{
    \CAgent::AddAgent(
        'Vendor\\ModuleName\\Agent\\CleanupAgent::run();',
        $this->MODULE_ID,
        'N',           // Периодичность: N — от завершения, Y — абсолютная
        86400,         // Интервал в секундах (24 часа)
        '',            // Дата первой проверки (пусто = сейчас)
        'Y',           // Активность
        '',            // Дата первого запуска (пусто = сейчас)
        100            // Сортировка
    );
}

public function UnInstallAgents(): void
{
    \CAgent::RemoveModuleAgents($this->MODULE_ID);
}
```

## SQL-миграции

### install/db/mysql/install.sql

```sql
CREATE TABLE IF NOT EXISTS vendor_module_items (
    ID INT NOT NULL AUTO_INCREMENT,
    NAME VARCHAR(255) NOT NULL,
    CODE VARCHAR(255) DEFAULT NULL,
    ACTIVE CHAR(1) NOT NULL DEFAULT 'Y',
    SORT INT NOT NULL DEFAULT 500,
    CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (ID),
    INDEX ix_code (CODE),
    INDEX ix_active_sort (ACTIVE, SORT)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### install/db/mysql/uninstall.sql

```sql
DROP TABLE IF EXISTS vendor_module_items;
```

## Административные страницы

### admin/items_list.php

```php
<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_admin_before.php';

use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;

Loc::loadMessages(__FILE__);
Loader::requireModule('vendor.modulename');

/** @var CMain $APPLICATION */
$APPLICATION->SetTitle(Loc::getMessage('VENDOR_MODULE_ITEMS_TITLE'));

require $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_admin_after.php';

// Используем AdminList helper или кастомный вывод
$items = \Vendor\ModuleName\ItemTable::getList([
    'select' => ['ID', 'NAME', 'ACTIVE', 'SORT'],
    'order' => ['SORT' => 'ASC'],
])->fetchAll();

// Вывод таблицы...

require $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/epilog_admin.php';
```

### Регистрация пункта меню (install/index.php)

```php
public function InstallFiles(): void
{
    // Копируем админ-страницы в /bitrix/admin/
    CopyDirFiles(
        __DIR__ . '/admin',
        $_SERVER['DOCUMENT_ROOT'] . '/bitrix/admin',
        true
    );
}

public function UnInstallFiles(): void
{
    DeleteDirFiles(
        __DIR__ . '/admin',
        $_SERVER['DOCUMENT_ROOT'] . '/bitrix/admin'
    );
}
```

### Файл меню admin/menu.php (в каталоге модуля)

```php
<?php

use Bitrix\Main\Localization\Loc;

Loc::loadMessages(__FILE__);

$aMenu = [
    [
        'parent_menu' => 'global_menu_services',
        'section' => 'vendor_module',
        'sort' => 500,
        'text' => Loc::getMessage('VENDOR_MODULE_MENU'),
        'title' => Loc::getMessage('VENDOR_MODULE_MENU_TITLE'),
        'icon' => 'vendor_module_icon',
        'page_icon' => 'vendor_module_page_icon',
        'items_id' => 'vendor_module_items',
        'items' => [
            [
                'text' => Loc::getMessage('VENDOR_MODULE_ITEMS_MENU'),
                'url' => 'vendor_module_items_list.php?lang=' . LANGUAGE_ID,
                'title' => Loc::getMessage('VENDOR_MODULE_ITEMS_MENU_TITLE'),
            ],
        ],
    ],
];

return $aMenu;
```

## Настройки модуля (options.php)

```php
<?php
// Файл: local/modules/vendor.modulename/options.php

use Bitrix\Main\Localization\Loc;
use Bitrix\Main\Config\Option;

Loc::loadMessages(__FILE__);

$moduleId = 'vendor.modulename';

// Чтение настройки
$value = Option::get($moduleId, 'option_name', 'default_value');

// Запись настройки
Option::set($moduleId, 'option_name', $newValue);

// Удаление настройки
Option::delete($moduleId, ['name' => 'option_name']);

// Форма настроек
$aTabs = [
    [
        'DIV' => 'edit1',
        'TAB' => Loc::getMessage('VENDOR_MODULE_TAB_SETTINGS'),
        'TITLE' => Loc::getMessage('VENDOR_MODULE_TAB_SETTINGS_TITLE'),
    ],
];

$tabControl = new CAdminTabControl('tabControl', $aTabs);

$request = \Bitrix\Main\Application::getInstance()->getContext()->getRequest();

if ($request->isPost() && $request->get('apply') && check_bitrix_sessid()) {
    Option::set($moduleId, 'api_key', $request->get('api_key'));
    // ... другие настройки
}
```

## Структура класса сервиса

```php
// lib/service/itemservice.php
namespace Vendor\ModuleName\Service;

use Vendor\ModuleName\ItemTable;
use Bitrix\Main\Result;
use Bitrix\Main\Error;

class ItemService
{
    public function create(array $data): Result
    {
        $result = new Result();

        // Валидация
        if (empty($data['NAME'])) {
            $result->addError(new Error('Name is required'));
            return $result;
        }

        // Сохранение
        $addResult = ItemTable::add($data);
        if (!$addResult->isSuccess()) {
            $result->addErrors($addResult->getErrors());
        } else {
            $result->setData(['id' => $addResult->getId()]);
        }

        return $result;
    }

    public function getById(int $id): ?array
    {
        return ItemTable::getById($id)->fetch() ?: null;
    }
}
```

## Регистрация в Service Locator

В `.settings_extra.php` или через `include.php`:

```php
// .settings_extra.php
return [
    'services' => [
        'value' => [
            'vendor.modulename.itemService' => [
                'className' => '\\Vendor\\ModuleName\\Service\\ItemService',
            ],
        ],
    ],
];
```

Использование:
```php
$service = \Bitrix\Main\DI\ServiceLocator::getInstance()
    ->get('vendor.modulename.itemService');
```
