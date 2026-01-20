# SK.AI Service Desk

Система управління інцидентами для зарядних станцій електромобілів.

## Основні можливості

✨ **Управління тікетами**
- Створення, призначення та відстеження інцидентів
- Автоматичне призначення тікетів на основі категорії
- Підтримка SLA та контроль термінів
- Коментарі та історія змін

🤖 **AI-асистент**
- RAG-система для пошуку в базі знань
- Аналіз логів зарядних станцій
- Автоматична класифікація проблем
- Рекомендації щодо вирішення

📊 **Аналітика**
- Дашборд з ключовими метриками
- Статистика по станціях та операторам
- Звіти по інцидентам
- Моніторинг SLA

🔔 **Сповіщення**
- Email та Telegram уведомлення
- Настроювані шаблони повідомлень
- Сповіщення про нові тікети та зміну статусу

👥 **Управління доступом**
- Ролі та права доступу
- Відділи та призначення
- Аудит дій користувачів

🌍 **Локалізація**
- Українська та англійська мови
- Легке додавання нових мов

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
git clone https://github.com/mishastd/ServiceDesk.git
cd ServiceDesk
```

Створіть файл `.env` з наступним вмістом:

```env
# Database
POSTGRES_DB=skai_servicedesk
POSTGRES_USER=skai
POSTGRES_PASSWORD=changeme_strong_password

# Backend
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OpenAI (тестовий ключ)
OPENAI_API_KEY=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

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Redis
REDIS_URL=redis://localhost:6379/0

# Storage paths
LOGS_STORAGE_PATH=/app/logs
ATTACHMENTS_STORAGE_PATH=/app/attachments

# Email (SMTP) - опціонально
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@skai.ua
EMAIL_FROM_NAME=SK.AI Service Desk

# Telegram - опціонально
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Frontend
VITE_API_URL=http://localhost:8000/api/v1
FRONTEND_URL=http://localhost:3000

# Localization
DEFAULT_LANGUAGE=uk
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

## Архітектура системи

### Компоненти

**Backend (FastAPI)**
- REST API для всіх операцій
- WebSocket для real-time оновлень
- JWT аутентифікація
- Celery workers для фонових задач

**Frontend (React)**
- SPA з роутингом
- Zustand для state management
- Ant Design UI компоненти
- i18next для локалізації

**База даних**
- PostgreSQL - головна реляційна БД
- Qdrant - векторна БД для RAG
- Redis - кеш та черги Celery

**AI/ML**
- OpenAI Embeddings для векторизації
- RAG для пошуку в базі знань
- GPT для аналізу логів

### Потік даних

```
Користувач → Frontend → Backend API → PostgreSQL
                              ↓
                        Celery Worker → Email/Telegram
                              ↓
                        RAG Service → Qdrant → OpenAI
```

## Імпорт даних станцій

Для імпорту станцій з CSV файлу:

```bash
# Скопіюйте CSV файл в контейнер
docker cp chargePoints.csv skai_backend:/app/

# Запустіть імпорт
docker exec skai_backend python -m app.scripts.import_stations /app/chargePoints.csv
```

Формат CSV:
- `StationId` - унікальний ID станції
- `ExternalId` - зовнішній ID
- `Name` - назва станції
- `Address` - адреса
- `Operator` - назва оператора

## Розробка нових функцій

### Додавання нового API endpoint

1. Створіть схему в `backend/app/schemas/`
2. Додайте роутер в `backend/app/api/v1/`
3. Реалізуйте бізнес-логіку в `backend/app/services/`
4. Додайте frontend API клієнт в `frontend/src/api/`
5. Створіть компонент в `frontend/src/pages/`

### Додавання нової мови

1. Backend: додайте JSON в `backend/app/i18n/translations/`
2. Frontend: додайте JSON в `frontend/src/i18n/locales/`
3. Оновіть конфігурацію i18next

## Troubleshooting

**Backend не запускається**
- Перевірте, що PostgreSQL запущений: `docker ps | grep postgres`
- Перегляньте логи: `docker logs skai_backend`
- Перевірте підключення до БД в `.env`

**Frontend показує помилки API**
- Перевірте VITE_API_URL в `.env`
- Переконайтеся, що backend запущений на порту 8000
- Перегляньте Network tab в DevTools

**Проблеми з RAG/AI**
- Перевірте OPENAI_API_KEY
- Переконайтеся, що Qdrant запущений: `docker ps | grep qdrant`
- Перегляньте логи векторної БД: `docker logs skai_qdrant`

## Контакти

**Команда розробки**: SK.AI R&D
**Проект**: Service Desk for EV Charging Stations

## Ліцензія

Proprietary - SK.AI R&D
⚠️ Це закритий проект. Використання тільки для внутрішніх потреб SK.AI.
