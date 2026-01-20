# SK.AI Service Desk

Система управління інцидентами для зарядних станцій електромобілів.

## Технологічний стек

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy 2.0 (async)
- PostgreSQL 15+
- Alembic (міграції)
- JWT аутентифікація
- Celery + Redis (черги задач)

### Frontend
- React 18 + TypeScript
- Ant Design
- Zustand (state management)
- react-i18next (локалізація)
- Vite

### AI/ML
- OpenAI text-embedding-3-small
- Qdrant (векторна БД)
- RAG для бази знань

### Інфраструктура
- Docker + Docker Compose
- Redis (кешування, черги)

## Швидкий старт

### 1. Клонування та налаштування

```bash
git clone <repo>
cd skai-servicedesk
cp .env.example .env
# Відредагуйте .env файл
```

### 2. Запуск всіх сервісів

```bash
docker-compose up -d
```

### 3. Застосування міграцій

```bash
docker-compose exec backend alembic upgrade head
```

### 4. Завантаження початкових даних

```bash
docker-compose exec backend python -m app.db.seeds
```

### 5. Доступ до системи

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **Qdrant Dashboard**: http://localhost:6333/dashboard

### Облікові дані за замовчуванням

- **Email**: admin@skai.ua
- **Password**: admin123

> ⚠️ Змініть пароль після першого входу!

## Структура проекту

```
skai-servicedesk/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API endpoints
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── notifications/   # Email, Telegram
│   │   ├── integrations/    # External integrations
│   │   ├── i18n/            # Localization
│   │   └── core/            # Security, permissions
│   ├── alembic/             # Database migrations
│   └── tests/
└── frontend/
    └── src/
        ├── api/             # API client
        ├── components/      # React components
        ├── pages/           # Page components
        ├── store/           # Zustand stores
        └── i18n/            # Translations
```

## API Endpoints

### Аутентифікація
- `POST /api/v1/auth/login` - Вхід
- `POST /api/v1/auth/refresh` - Оновлення токену
- `GET /api/v1/auth/me` - Поточний користувач

### Тікети
- `GET /api/v1/tickets` - Список тікетів
- `POST /api/v1/tickets` - Створення тікету
- `GET /api/v1/tickets/{id}` - Деталі тікету
- `PUT /api/v1/tickets/{id}/status` - Зміна статусу
- `PUT /api/v1/tickets/{id}/assign` - Призначення
- `POST /api/v1/tickets/{id}/comments` - Додати коментар

### Станції
- `GET /api/v1/stations` - Список станцій
- `POST /api/v1/stations` - Створення станції
- `GET /api/v1/stations/search` - Пошук станцій

### База знань
- `GET /api/v1/knowledge` - Список статей
- `POST /api/v1/knowledge/search` - RAG пошук

## Локалізація

Підтримуються мови:
- 🇺🇦 Українська (за замовчуванням)
- 🇬🇧 English

Файли локалізації:
- Backend: `backend/app/i18n/translations/`
- Frontend: `frontend/src/i18n/locales/`

## Сповіщення

Система підтримує сповіщення через:
- **Email** (SMTP)
- **Telegram** (бот)

Налаштування в `.env` файлі.

## Інтеграції

Модульна архітектура дозволяє додавати нові інтеграції:

```python
# backend/app/integrations/modules/example/__init__.py
from app.integrations.base import BaseIntegration
from app.integrations.registry import register_integration

@register_integration
class Integration(BaseIntegration):
    CODE = "example"
    NAME = "Example Integration"
    HOOKS = ["ticket.created"]

    async def on_ticket_created(self, ticket: dict):
        # Your integration logic
        pass
```

## Розробка

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Міграції БД

```bash
# Створити нову міграцію
alembic revision --autogenerate -m "description"

# Застосувати міграції
alembic upgrade head
```

## Ліцензія

Proprietary - SK.AI R&D
