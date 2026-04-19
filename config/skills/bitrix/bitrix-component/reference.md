# Bitrix D7 Components — Полная справка

## Жизненный цикл компонента

```
1. __construct()           — конструктор (не переопределять без parent)
2. onPrepareComponentParams($arParams) — обработка входных параметров (static-метод)
3. executeComponent()      — основной метод (вся логика тут)
   ├── startResultCache()  — начало кеширования
   ├── includeComponentTemplate() — подключение шаблона
   └── endResultCache()    — автоматическое завершение
```

## Кеширование

### Базовое кеширование

```php
public function executeComponent(): void
{
    // startResultCache учитывает: CACHE_TIME, параметры, шаблон, сайт
    if ($this->startResultCache($this->arParams['CACHE_TIME'])) {
        $this->arResult['ITEMS'] = $this->fetchItems();

        if (empty($this->arResult['ITEMS'])) {
            $this->abortResultCache();
            return;
        }

        $this->includeComponentTemplate();
    }

    // Код после кеширования — выполняется всегда
    // (для данных, не попадающих в кеш)
}
```

### Тегированный кеш

```php
public function executeComponent(): void
{
    if ($this->startResultCache()) {
        $this->arResult['ITEMS'] = $this->fetchItems();

        // Регистрация тегов для инвалидации
        if (defined('BX_COMP_MANAGED_CACHE')) {
            $taggedCache = \Bitrix\Main\Application::getInstance()->getTaggedCache();
            $taggedCache->registerTag('iblock_id_' . $this->arParams['IBLOCK_ID']);
        }

        $this->includeComponentTemplate();
    }
}
```

### Дополнительный ID кеша

```php
// Если результат зависит от внешних факторов (пользователь, GET-параметры и т.д.)
if ($this->startResultCache(
    $this->arParams['CACHE_TIME'],
    [$USER->GetID(), $request->get('page')]  // additionalCacheId
)) {
    // ...
}
```

## Ajax-компоненты

### class.php с поддержкой ajax

```php
class VendorAjaxComponent extends CBitrixComponent
{
    public function executeComponent(): void
    {
        $request = \Bitrix\Main\Application::getInstance()
            ->getContext()
            ->getRequest();

        if ($request->isAjaxRequest() && $request->get('action')) {
            $this->processAjaxAction($request);
            return;
        }

        // Обычный вывод
        $this->arResult['ITEMS'] = $this->fetchItems();
        $this->includeComponentTemplate();
    }

    private function processAjaxAction(\Bitrix\Main\HttpRequest $request): void
    {
        $action = $request->get('action');
        $result = [];

        switch ($action) {
            case 'loadMore':
                $page = (int)$request->get('page');
                $result = $this->fetchItems($page);
                break;
        }

        // Чистый JSON-ответ
        global $APPLICATION;
        $APPLICATION->RestartBuffer();

        header('Content-Type: application/json');
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        die();
    }
}
```

### Ajax через D7 Controller (рекомендуется)

```php
// В class.php определить метод-action
class VendorControllerComponent extends CBitrixComponent
    implements \Bitrix\Main\Engine\Contract\Controllerable
{
    public function configureActions(): array
    {
        return [
            'loadItems' => [
                'prefilters' => [
                    new \Bitrix\Main\Engine\ActionFilter\HttpMethod(
                        [\Bitrix\Main\Engine\ActionFilter\HttpMethod::METHOD_POST]
                    ),
                ],
            ],
        ];
    }

    public function loadItemsAction(int $page = 1): array
    {
        // Автоматическая обёртка в JSON
        return [
            'items' => $this->fetchItems($page),
            'hasMore' => true,
        ];
    }

    public function executeComponent(): void
    {
        $this->arResult['ITEMS'] = $this->fetchItems();
        $this->arResult['SIGNED_PARAMS'] = $this->getSignedParameters();
        $this->includeComponentTemplate();
    }
}
```

```javascript
// Вызов из JS
BX.ajax.runComponentAction('vendor:component.name', 'loadItems', {
    mode: 'class',
    signedParameters: signedParams,  // из $arResult['SIGNED_PARAMS']
    data: { page: 2 }
}).then(function(response) {
    console.log(response.data);
});
```

## ЧПУ (SEF Mode)

### Компонент с поддержкой ЧПУ

```php
class VendorSefComponent extends CBitrixComponent
{
    private const SEF_TEMPLATES = [
        'list' => '',
        'section' => '#SECTION_CODE#/',
        'detail' => '#SECTION_CODE#/#ELEMENT_CODE#/',
    ];

    public function executeComponent(): void
    {
        if ($this->arParams['SEF_MODE'] === 'Y') {
            $componentPage = \CComponentEngine::parseComponentPath(
                $this->arParams['SEF_FOLDER'],
                self::SEF_TEMPLATES,
                $variables
            );

            if (!$componentPage) {
                $this->process404();
                return;
            }

            \CComponentEngine::initComponentVariables(
                $componentPage,
                ['SECTION_CODE', 'ELEMENT_CODE'],
                $this->arParams['SEF_URL_TEMPLATES'] ?? self::SEF_TEMPLATES,
                $variables
            );

            $this->arResult['VARIABLES'] = $variables;
        }

        // Подключить нужный шаблон на основе $componentPage
        $this->includeComponentTemplate($componentPage);
    }

    private function process404(): void
    {
        \Bitrix\Iblock\Component\Tools::process404(
            'N',  // set404
            true,  // use404Component
            true,  // setSEF
            true   // setStatus
        );
    }
}
```

### .parameters.php для ЧПУ

```php
$arComponentParameters = [
    'GROUPS' => [
        'SEF_MODE' => [
            'NAME' => Loc::getMessage('SEF_MODE_GROUP'),
        ],
    ],
    'PARAMETERS' => [
        'SEF_MODE' => [
            'list' => [
                'NAME' => Loc::getMessage('SEF_LIST'),
                'DEFAULT' => '',
                'VARIABLES' => [],
            ],
            'section' => [
                'NAME' => Loc::getMessage('SEF_SECTION'),
                'DEFAULT' => '#SECTION_CODE#/',
                'VARIABLES' => ['SECTION_CODE'],
            ],
            'detail' => [
                'NAME' => Loc::getMessage('SEF_DETAIL'),
                'DEFAULT' => '#SECTION_CODE#/#ELEMENT_CODE#/',
                'VARIABLES' => ['SECTION_CODE', 'ELEMENT_CODE'],
            ],
        ],
    ],
];
```

## Наследование компонентов

```php
// Наследование стандартного компонента Bitrix
// Файл: /local/components/vendor/news.list/class.php

// Копируем из /bitrix/components/bitrix/news.list/class.php
// и расширяем:

class VendorNewsListComponent extends CNewsListComponent
{
    protected function getIblockElements(): void
    {
        parent::getIblockElements();

        // Дополнительная обработка
        foreach ($this->arResult['ITEMS'] as &$item) {
            $item['CUSTOM_FIELD'] = $this->processCustomField($item);
        }
    }
}
```

## Типы параметров (.parameters.php)

| TYPE | Описание | Дополнительно |
|------|---------|--------------|
| `STRING` | Текстовое поле | — |
| `LIST` | Выпадающий список | `VALUES => ['key' => 'Label']` |
| `CHECKBOX` | Чекбокс (Y/N) | `DEFAULT => 'N'` |
| `COLORPICKER` | Выбор цвета | — |
| `FILE` | Выбор файла | — |
| `CUSTOM` | Кастомный тип | `JS_FILE`, `JS_EVENT`, `JS_DATA` |

```php
'SORT_BY' => [
    'PARENT' => 'DATA_SOURCE',
    'NAME' => Loc::getMessage('SORT_BY'),
    'TYPE' => 'LIST',
    'VALUES' => [
        'SORT' => Loc::getMessage('SORT_BY_SORT'),
        'NAME' => Loc::getMessage('SORT_BY_NAME'),
        'DATE_CREATE' => Loc::getMessage('SORT_BY_DATE'),
    ],
    'DEFAULT' => 'SORT',
    'ADDITIONAL_VALUES' => 'Y',  // позволяет вводить произвольное значение
],
```

## result_modifier.php

```php
<?php
// templates/.default/result_modifier.php
// Выполняется ПОСЛЕ executeComponent(), но ДО вывода template.php
// Позволяет модифицировать $arResult без изменения class.php

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

// Добавить вычисляемые данные для шаблона
foreach ($arResult['ITEMS'] as &$item) {
    $item['FORMATTED_DATE'] = FormatDate('d F Y', MakeTimeStamp($item['DATE_CREATE']));
}
unset($item);
```

## component_epilog.php

```php
<?php
// templates/.default/component_epilog.php
// Выполняется ПОСЛЕ шаблона и ПОСЛЕ кеширования
// Здесь можно работать с данными, которые не должны кешироваться

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

// Например, подсчёт просмотров (не кешируется)
\Bitrix\Main\Application::getInstance()->getTaggedCache()
    ->clearByTag('element_view_' . $arResult['ITEM']['ID']);
```
