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

## 2) Отримання інформації про класи

**Список/пошук класів**
- `GET /level-1/classes?q=...` — повертає всі класи або фільтрує за підрядком у назві.

**Отримати клас за назвою**
- `GET /level-1/classes/{name}`

**Приклад**
```bash
curl -sS http://localhost:8000/level-1/classes/Person
```

## 3) Оновлення класів (коли структура неповна)

**Endpoint**
- `PATCH /level-1/classes/{name}`

**Тіло запиту**
- Повний `ClassDef` з актуальними `properties` та `relations`.

**Приклад**
```bash
curl -sS -X PATCH http://localhost:8000/level-1/classes/Person \
  -H 'Content-Type: application/json' \
  -d '{"name":"Person","properties":[{"name":"age","type":"number","required":true}],"relations":[]}'
```

## 4) Створення об’єктів (рівень 2)

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

## 5) Отримання інформації про об’єкти

**Список/пошук об’єктів**
- `GET /level-2/objects?q=...&class_name=...` — повертає всі або фільтрує за назвою/класом.

**Отримати об’єкт за назвою**
- `GET /level-2/objects/{name}`

**Приклад**
```bash
curl -sS http://localhost:8000/level-2/objects/Alice
```

## 6) Оновлення об’єктів (коли властивості/зв’язки неповні)

**Endpoint**
- `PATCH /level-2/objects/{name}`

**Тіло запиту**
- Повний `ObjectInstance` з актуальними `properties` та `relations`.

**Приклад**
```bash
curl -sS -X PATCH http://localhost:8000/level-2/objects/Alice \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","class_name":"Person","properties":{"age":31},"relations":[]}'
```

## 7) Рекомендований порядок перевірки для нейромережі

1. `GET /level-1/classes/{name}` — перевірити клас та його `properties/relations`.
2. Якщо клас відсутній → `POST /level-1/classes`.
3. Якщо клас є, але структура неповна → `PATCH /level-1/classes/{name}`.
4. `GET /level-2/objects/{name}` — перевірити об’єкт та його `properties/relations`.
5. Якщо об’єкта немає → `POST /level-2/objects`.
6. Якщо об’єкт є, але неповний → `PATCH /level-2/objects/{name}`.

## 8) Збереження у файли (після створення/оновлення)

**Endpoint**
- `POST /storage/save`

**Приклад**
```bash
curl -sS -X POST http://localhost:8000/storage/save
```

Після цього дані зберігаються у JSON-файли:
- `api/data/level1.json`
- `api/data/level2.json`

## 9) Опційно: “скім” для нейромережі

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
