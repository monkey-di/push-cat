---
name: bitrix-reference
description: Bitrix D7 Framework expert. ALWAYS invoke this skill when working with Bitrix CMS code, PHP files containing Bitrix namespaces, .settings.php, .settings_extra.php, or files under /local/ and /bitrix/ directories. Do not write Bitrix D7 code from memory directly -- use this skill first for conventions and architecture reference.
user-invocable: false
---

# Bitrix D7 Framework — Reference Guide

Ты работаешь с проектом на **1С-Битрикс** (Bitrix Framework). Используй **только D7 API** (namespace `Bitrix\*`). Старый API (`CIBlockElement`, `CModule::IncludeModule` и т.д.) запрещён, кроме случаев, когда D7-аналога не существует.

## Ключевые принципы

1. **Namespace-first**: Все классы — в пространстве имён `Bitrix\<Module>\*`. Кастомные модули: `<Vendor>\<Module>\*`
2. **ORM-centric**: Работа с БД — только через DataManager/ORM. Прямые SQL-запросы запрещены
3. **Event-driven**: Расширение логики — через события (EventManager), не через патчи ядра
4. **Локализация**: Все строки — через `Loc::getMessage()`, файлы `lang/<lang>/` рядом с кодом
5. **Автозагрузка**: D7 использует PSR-0-подобную автозагрузку из `lib/` каталога модуля

## Структура проекта

```
/local/                         # Кастомизации (приоритет над /bitrix/)
├── modules/                    # Кастомные модули
│   └── vendor.module/
│       ├── lib/                # D7 классы (автозагрузка)
│       ├── install/            # Установщик
│       └── include.php
├── components/                 # Кастомные компоненты
│   └── vendor/
│       └── component.name/
├── templates/                  # Шаблоны сайта
├── php_interface/              # init.php, events.php
│   └── init.php                # Точка входа для кастомного кода
└── activities/                 # Активити бизнес-процессов

/bitrix/                        # Ядро (НЕ МОДИФИЦИРОВАТЬ)
├── modules/                    # Системные модули
├── components/                 # Системные компоненты
└── .settings.php               # Конфигурация
```

## Часто используемые D7 классы

| Область | Класс | Назначение |
|---------|-------|-----------|
| Ядро | `Bitrix\Main\Application` | Singleton приложения |
| HTTP | `Bitrix\Main\HttpRequest` | Текущий запрос |
| БД | `Bitrix\Main\DB\Connection` | Подключение к БД |
| ORM | `Bitrix\Main\ORM\Data\DataManager` | Базовый класс ORM |
| События | `Bitrix\Main\EventManager` | Менеджер событий |
| Файлы | `Bitrix\Main\IO\File` | Работа с файлами |
| Кеш | `Bitrix\Main\Data\Cache` | Кеширование |
| Модули | `Bitrix\Main\Loader` | Загрузка модулей |
| Локализация | `Bitrix\Main\Localization\Loc` | Мультиязычность |

## Загрузка модулей

```php
use Bitrix\Main\Loader;

// Всегда проверять результат
if (!Loader::includeModule('iblock')) {
    throw new \RuntimeException('Module iblock is not installed');
}
```

## Контекст приложения

```php
use Bitrix\Main\Application;

$app = Application::getInstance();
$connection = $app->getConnection();
$request = $app->getContext()->getRequest();
$server = $app->getContext()->getServer();
```

## Запрещённые паттерны (антипаттерны)

- `$GLOBALS['DB']->Query(...)` → используй ORM или `Application::getConnection()`
- `CModule::IncludeModule()` → `Bitrix\Main\Loader::includeModule()`
- `CIBlockElement::GetList()` → `Bitrix\Iblock\Elements\ElementXxxTable::getList()`
- `include($_SERVER['DOCUMENT_ROOT'].'/bitrix/header.php')` в API-контексте
- Прямое изменение файлов в `/bitrix/` — только `/local/`

Для более детальной информации об архитектуре смотри [architecture.md](architecture.md).
Для конвенций кода и антипаттернов смотри [conventions.md](conventions.md).
