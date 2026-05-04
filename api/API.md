# API: створення класів і об’єктів

Базовий префікс усіх запитів: `/api` у фронтенді (у бекенді — звичайні шляхи, наприклад `/level-1/classes`).

## 1) Створення класів (рівень 1)

**Endpoint**
- `POST /level-1/classes`

**Тіло запиту (ClassDef)**
```json
{
  "name": "Person",
  "properties": [
    {
      "name": "age",
      "type": "number",
      "required": true,
      "description": "Вік"
    }
  ],
  "relations": [
    {
      "name": "works_at",
      "from_class": "Person",
      "to_class": "Company",
      "cardinality": null
    }
  ]
}
```

**Поля**
- `name` (string, required) — унікальна назва класу.
- `properties` (array, optional) — список властивостей класу.
  - `name` (string, required) — назва властивості.
  - `type` (string, optional) — тип: `string | number | boolean | object | array`. За замовчуванням `string`.
  - `required` (boolean, optional) — чи обов’язкова властивість. За замовчуванням `false`.
  - `description` (string|null, optional) — опис властивості.
- `relations` (array, optional) — дозволені типи зв’язків між класами.
  - `name` (string, required) — назва зв’язку.
  - `from_class` (string, required) — клас-джерело.
  - `to_class` (string, required) — клас-призначення.
  - `cardinality` (string|null, optional) — кардинальність (за потреби).

**Відповідь**
- `201 Created` + JSON з об’єктом класу.
- `409` якщо клас уже існує.

**Приклад**
```bash
curl -sS -X POST http://localhost:8000/level-1/classes \
  -H 'Content-Type: application/json' \
  -d '{"name":"Person","properties":[],"relations":[]}'
```

## 2) Створення об’єктів (рівень 2)

**Endpoint**
- `POST /level-2/objects`

**Тіло запиту (ObjectInstance)**
```json
{
  "name": "Alice",
  "class_name": "Person",
  "properties": {
    "age": 31,
    "email": "alice@example.com"
  },
  "relations": [
    {
      "name": "works_at",
      "from_object": "Alice",
      "to_object": "Acme"
    }
  ]
}
```

**Поля**
- `name` (string, required) — унікальна назва об’єкта.
- `class_name` (string, required) — назва класу, до якого належить об’єкт.
- `properties` (object, optional) — значення властивостей.
- `relations` (array, optional) — зв’язки з іншими об’єктами.
  - `name` (string, required) — назва зв’язку (має відповідати зв’язку класу).
  - `from_object` (string, required) — об’єкт-джерело.
  - `to_object` (string, required) — об’єкт-призначення.

**Валідація**
- `class_name` має існувати серед класів.
- `relations` мають відповідати зв’язкам, описаним у класі `class_name`.
- `to_object` має існувати, а його клас має збігатися з `to_class` у визначенні зв’язку класів.

**Відповідь**
- `201 Created` + JSON з об’єктом.
- `400` якщо клас не існує або зв’язки некоректні.
- `409` якщо об’єкт уже існує.

**Приклад**
```bash
curl -sS -X POST http://localhost:8000/level-2/objects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","class_name":"Person","properties":{},"relations":[]}'
```

## 3) Збереження у файли (після створення)

**Endpoint**
- `POST /storage/save`

**Приклад**
```bash
curl -sS -X POST http://localhost:8000/storage/save
```

Після цього дані зберігаються у JSON-файли:
- `api/data/level1.json`
- `api/data/level2.json`

## 4) Опційно: “скім” для нейромережі

Якщо нейромережа створює/оновлює класи та об’єкти батчем:

**Endpoint**
- `POST /skills/sync`

**Тіло запиту**
```json
{
  "classes": [],
  "objects": [],
  "load_first": true,
  "reconcile": true,
  "augment_classes": true,
  "keep_extra_properties": true,
  "save": true
}
```

Цей endpoint сам завантажує поточні дані, зливає/перевіряє структури й зберігає результат у файли.
