---
name: bitrix-module
description: >
  Bitrix Module expert. ALWAYS invoke this skill when the user asks about creating a Bitrix module, install/index.php, include.php, module structure, or custom module scaffolding.
  Do not scaffold Bitrix modules directly -- use this skill first.
argument-hint: [vendor.modulename]
---

# Bitrix D7 — Создание кастомного модуля

Создай модуль `$ARGUMENTS` с полной D7-структурой.

## Процесс

### 1. Определи структуру

Имя модуля: `vendor.modulename` (lowercase, точка-разделитель).
Namespace: `Vendor\ModuleName` (PascalCase).

```
local/modules/vendor.modulename/
├── include.php                    # Подключение модуля
├── install/
│   ├── index.php                  # Класс установщика
│   ├── version.php                # Версия модуля
│   ├── db/
│   │   └── mysql/
│   │       ├── install.sql        # Создание таблиц
│   │       └── uninstall.sql      # Удаление таблиц
│   ├── components/                # Компоненты модуля (опционально)
│   └── unstep1.php, unstep2.php   # Шаги деинсталляции (опционально)
├── lib/                           # D7 классы (автозагрузка)
│   ├── itemtable.php              # ORM-сущность
│   └── service/
│       └── itemservice.php        # Сервис бизнес-логики
├── admin/                         # Админ-страницы (опционально)
│   └── items_list.php
└── lang/
    └── ru/
        ├── install/
        │   └── index.php
        └── lib/
            └── itemtable.php
```

### 2. Создай install/version.php

```php
<?php
$arModuleVersion = [
    'VERSION' => '1.0.0',
    'VERSION_DATE' => '2024-01-01 00:00:00',
];
```

### 3. Создай install/index.php (установщик)

```php
<?php

use Bitrix\Main\Localization\Loc;
use Bitrix\Main\ModuleManager;
use Bitrix\Main\Application;

Loc::loadMessages(__FILE__);

class vendor_modulename extends CModule
{
    public $MODULE_ID = 'vendor.modulename';

    public function __construct()
    {
        $arModuleVersion = [];
        include __DIR__ . '/version.php';

        $this->MODULE_VERSION = $arModuleVersion['VERSION'];
        $this->MODULE_VERSION_DATE = $arModuleVersion['VERSION_DATE'];
        $this->MODULE_NAME = Loc::getMessage('VENDOR_MODULE_NAME');
        $this->MODULE_DESCRIPTION = Loc::getMessage('VENDOR_MODULE_DESCRIPTION');
    }

    public function DoInstall(): void
    {
        $this->InstallDB();
        $this->InstallEvents();
        $this->InstallFiles();
        ModuleManager::registerModule($this->MODULE_ID);
    }

    public function DoUninstall(): void
    {
        $this->UnInstallEvents();
        $this->UnInstallFiles();
        $this->UnInstallDB();
        ModuleManager::unRegisterModule($this->MODULE_ID);
    }

    public function InstallDB(): void
    {
        $connection = Application::getConnection();
        $sqlFiles = glob(__DIR__ . '/db/mysql/install.sql');
        if ($sqlFiles) {
            $sql = file_get_contents($sqlFiles[0]);
            $connection->executeSqlBatch($sql);
        }
    }

    public function UnInstallDB(): void
    {
        $connection = Application::getConnection();
        $sqlFiles = glob(__DIR__ . '/db/mysql/uninstall.sql');
        if ($sqlFiles) {
            $sql = file_get_contents($sqlFiles[0]);
            $connection->executeSqlBatch($sql);
        }
    }

    public function InstallEvents(): void
    {
        // Регистрация обработчиков событий
    }

    public function UnInstallEvents(): void
    {
        // Удаление обработчиков событий
    }

    public function InstallFiles(): void
    {
        // Копирование файлов (компонентов, JS, CSS)
    }

    public function UnInstallFiles(): void
    {
        // Удаление файлов
    }
}
```

### 4. Создай include.php

```php
<?php

use Bitrix\Main\Loader;

Loader::registerAutoLoadClasses(
    'vendor.modulename',
    [
        'Vendor\\ModuleName\\ItemTable' => 'lib/itemtable.php',
        'Vendor\\ModuleName\\Service\\ItemService' => 'lib/service/itemservice.php',
        // Все классы модуля регистрируются тут
    ]
);
```

### 5. Создай ORM-сущности в lib/

Каждый класс — в отдельном файле, namespace соответствует структуре.

### 6. Проверь

- `MODULE_ID` = имя каталога = `vendor.modulename`
- Класс установщика = `vendor_modulename` (точка → подчёркивание)
- `include.php` регистрирует все классы
- SQL install/uninstall — IF NOT EXISTS / IF EXISTS
- Локализация в `lang/ru/install/index.php`
- Версия в `install/version.php`

Для полной справки по структуре, событиям и админ-страницам смотри [reference.md](reference.md).
