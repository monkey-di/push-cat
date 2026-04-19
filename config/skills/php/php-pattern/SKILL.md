---
name: php-pattern
description: >
  PHP design patterns expert. ALWAYS invoke this skill when the user asks about design patterns, Strategy, Repository, Observer, Factory, Decorator, Singleton, or any GoF/enterprise pattern in PHP.
  Do not implement design patterns directly -- use this skill first.
argument-hint: [pattern-name]
---

# PHP 8+ — Реализация паттерна проектирования

Реализуй паттерн `$ARGUMENTS` с использованием современного PHP 8+ синтаксиса.

## Доступные паттерны

### Creational (порождающие)

| Паттерн | Когда |
|---------|-------|
| **Factory Method** | Создание объектов без указания точного класса |
| **Abstract Factory** | Семейства связанных объектов |
| **Builder** | Пошаговое создание сложных объектов |
| **Prototype** | Клонирование существующих объектов |

### Structural (структурные)

| Паттерн | Когда |
|---------|-------|
| **Decorator** | Добавление поведения без изменения класса |
| **Adapter** | Совместимость несовместимых интерфейсов |
| **Composite** | Древовидные структуры |
| **Proxy** | Контроль доступа / ленивая загрузка |

### Behavioral (поведенческие)

| Паттерн | Когда |
|---------|-------|
| **Strategy** | Взаимозаменяемые алгоритмы |
| **Observer** | Реакция на изменения состояния |
| **Specification** | Комбинируемые бизнес-правила |
| **Chain of Responsibility** | Цепочка обработчиков |

### Domain-Driven (доменные)

| Паттерн | Когда |
|---------|-------|
| **Repository** | Абстракция доступа к данным |
| **Value Object** | Объект-значение (деньги, адрес, email) |
| **DTO** | Передача данных между слоями |
| **Result/Either** | Возврат успеха или ошибки без исключений |
| **CQRS** | Разделение чтения и записи |

## Инструкции

1. Определи, какой паттерн нужен
2. Используй **PHP 8+ синтаксис**: readonly, enums, union types, constructor promotion, named args
3. Применяй **interface-first** подход
4. Классы **final по умолчанию**
5. Все типы **строго типизированы**

Для полной справки с реализацией каждого паттерна смотри [reference.md](reference.md).
