# Розгортання Service Desk на VPS

## Вимоги
- Docker + Docker Compose
- Git
- Nginx (reverse proxy)

## Кроки

### 1. Клонування
```bash
git clone <repo_url>
cd ServiceDesk
```

### 2. Налаштування .env
```bash
cp .env.example .env
# Відредагуйте .env — встановіть надійні паролі та SECRET_KEY
```

### 3. Запуск
```bash
docker-compose up -d --build
docker-compose exec backend alembic upgrade head
docker-compose exec backend python -m app.db.seeds
```

### 4. Оновлення
```bash
git pull origin main
docker-compose up -d --build frontend backend
docker-compose exec -T backend alembic upgrade head
```

### 5. Бекап БД
```bash
docker-compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d).sql
```
