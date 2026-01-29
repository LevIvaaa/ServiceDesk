# Развёртывание Ecofactor Service Desk на VPS

## Информация о сервере
- **VPS**: vps-0b86ca29.vps.ovh.net
- **IPv4**: 57.128.250.75
- **IPv6**: 2001:41d0:601:1100::7d84
- **User**: debian
- **OS**: Debian

## Шаги развёртывания

### 1. Подключение к серверу
```bash
ssh debian@57.128.250.75
```

### 2. Установка необходимого ПО
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker debian

# Установка Docker Compose
sudo apt install docker-compose -y

# Установка Git
sudo apt install git -y

# Установка Nginx (для reverse proxy)
sudo apt install nginx -y
```

### 3. Клонирование проекта
```bash
cd ~
git clone https://github.com/LevIvaaa/ServiceDesk.git
cd ServiceDesk
```

### 4. Настройка переменных окружения
```bash
# Создать .env файл
cat > .env << 'EOF'
# Database
POSTGRES_USER=ecofactor_user
POSTGRES_PASSWORD=ecofactor_password_prod_2026
POSTGRES_DB=ecofactor_db
DATABASE_URL=postgresql+asyncpg://ecofactor_user:ecofactor_password_prod_2026@postgres:5432/ecofactor_db

# Redis
REDIS_URL=redis://redis:6379/0

# Qdrant
QDRANT_URL=http://qdrant:6333

# JWT
SECRET_KEY=your-super-secret-key-change-in-production-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
BACKEND_CORS_ORIGINS=["http://57.128.250.75","http://localhost:3000"]

# Frontend
VITE_API_URL=http://57.128.250.75:8000
EOF
```

### 5. Настройка Nginx как reverse proxy
```bash
sudo nano /etc/nginx/sites-available/ecofactor
```

Добавить конфигурацию:
```nginx
server {
    listen 80;
    server_name 57.128.250.75;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend docs
    location /docs {
        proxy_pass http://localhost:8000;
    }

    location /openapi.json {
        proxy_pass http://localhost:8000;
    }
}
```

Активировать конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/ecofactor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Запуск проекта
```bash
cd ~/ServiceDesk
docker-compose up -d
```

### 7. Применение миграций и загрузка данных
```bash
# Применить миграции
docker-compose exec backend alembic upgrade head

# Загрузить начальные данные
docker-compose exec backend python -m app.db.seeds

# Загрузить отделы
docker-compose exec backend python -m app.scripts.seed_departments

# Загрузить операторов
docker-compose exec backend python -m app.scripts.seed_operators

# Загрузить станции
docker-compose exec backend python -m app.scripts.seed_stations

# Загрузить пользователей
docker-compose exec backend python -m app.scripts.seed_users

# Создать Ticket Handler
docker-compose exec backend python -m app.scripts.create_ticket_handler

# Распределить пользователей по отделам
docker-compose exec backend python -m app.scripts.redistribute_users

# Транслитерировать имена
docker-compose exec backend python -m app.scripts.transliterate_names

# Транслитерировать станции
docker-compose exec backend python -m app.scripts.transliterate_stations
```

### 8. Проверка работы
```bash
# Проверить статус контейнеров
docker-compose ps

# Проверить логи
docker-compose logs -f
```

### 9. Доступ к приложению
- **Frontend**: http://57.128.250.75:3000
- **Backend API**: http://57.128.250.75:8000
- **API Docs**: http://57.128.250.75:8000/docs

### 10. Учётные данные
- **Admin**: admin@ecofactor.ua / admin123
- **Ticket Handler**: tickets@gmail.com / lagger2099

## Статус развёртывания

✅ **Развёртывание завершено успешно!**

Дата: 28 января 2026



Все сервисы запущены и работают:
- ✅ PostgreSQL (база данных) - ecofactor_postgres
- ✅ Redis (кэш и очереди) - ecofactor_redis
- ✅ Qdrant (векторная БД для RAG) - ecofactor_qdrant
- ✅ Backend API (FastAPI) - ecofactor_backend
- ✅ Frontend (React + Vite) - ecofactor_frontend
- ✅ Celery Worker (фоновые задачи) - ecofactor_celery_worker
- ✅ Celery Beat (планировщик) - ecofactor_celery_beat

Загружены начальные данные:
- ✅ 7 отделов (departments)
- ✅ 35 операторов (operators)
- ✅ 35 зарядных станций (stations)
- ✅ 34 пользователя + 1 admin + 1 ticket handler
- ✅ Роли и права доступа
- ✅ Транслитерация имён и станций

## Автозапуск при перезагрузке
```bash
# Docker уже настроен на автозапуск
# Для автозапуска контейнеров добавить в docker-compose.yml:
# restart: always
```

## Обновление проекта
```bash
cd ~/ServiceDesk
git pull origin main
docker-compose down
docker-compose up -d --build
```

## Мониторинг
```bash
# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend

# Использование ресурсов
docker stats
```

## Резервное копирование
```bash
# Бэкап базы данных
docker-compose exec postgres pg_dump -U ecofactor_user ecofactor_db > backup_$(date +%Y%m%d).sql

# Восстановление
docker-compose exec -T postgres psql -U ecofactor_user ecofactor_db < backup_20260128.sql
```
