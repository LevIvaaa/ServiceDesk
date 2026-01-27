# 🚀 CI/CD Guide для SK.AI Service Desk

## 📚 Что такое CI/CD?

### CI (Continuous Integration) - Непрерывная интеграция
Автоматическая проверка кода при каждом коммите:
- ✅ Запуск тестов
- ✅ Проверка качества кода (линтинг)
- ✅ Сборка проекта
- ✅ Обнаружение ошибок на ранней стадии

### CD (Continuous Deployment) - Непрерывное развертывание
Автоматический деплой после успешного CI:
- ✅ Автоматическая публикация на сервер
- ✅ Без ручных действий
- ✅ Быстрая доставка изменений пользователям

---

## 🎯 Настроенные Pipeline

### 1️⃣ GitHub Pages (Frontend Only)
**Файл:** `.github/workflows/deploy-frontend.yml`

**Что делает:**
1. При пуше в `main` ветку
2. Устанавливает Node.js
3. Собирает frontend (production build)
4. Деплоит на GitHub Pages

**Как включить:**
1. Зайди в Settings → Pages
2. Source: выбери "GitHub Actions"
3. Сделай push в main
4. Сайт будет доступен: `https://levivaa.github.io/ServiceDesk/`

**⚠️ Ограничения:**
- Только статический frontend
- Backend не работает (нужен отдельный сервер)
- API запросы не будут работать

---

### 2️⃣ Full CI/CD Pipeline (Docker)
**Файл:** `.github/workflows/ci-cd.yml`

**Что делает:**

#### Job 1: Test (Тестирование)
- Проверяет Python код (flake8)
- Собирает frontend
- Запускается при каждом push и pull request

#### Job 2: Build Docker (Сборка образов)
- Собирает Docker образы для backend и frontend
- Пушит в GitHub Container Registry
- Запускается только при push в main

#### Job 3: Notify (Уведомление)
- Показывает статус деплоя
- Ссылки на Docker образы

**Как использовать:**
1. Docker образы автоматически публикуются в GitHub Packages
2. Можно скачать и запустить на любом сервере:
```bash
docker pull ghcr.io/levivaa/servicedesk/backend:latest
docker pull ghcr.io/levivaa/servicedesk/frontend:latest
```

---

## 📊 Как работает GitHub Actions

```
┌─────────────────────────────────────────────────────┐
│  Разработчик делает git push                        │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  GitHub получает код                                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  GitHub Actions запускает Workflow                  │
│  (файлы в .github/workflows/*.yml)                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Job 1: Test                                        │
│  - Установка зависимостей                           │
│  - Запуск тестов                                    │
│  - Проверка кода                                    │
└────────────────┬────────────────────────────────────┘
                 │ ✅ Успешно
                 ▼
┌─────────────────────────────────────────────────────┐
│  Job 2: Build                                       │
│  - Сборка Docker образов                            │
│  - Публикация в Registry                            │
└────────────────┬────────────────────────────────────┘
                 │ ✅ Успешно
                 ▼
┌─────────────────────────────────────────────────────┐
│  Job 3: Deploy                                      │
│  - Деплой на сервер                                 │
│  - Уведомление об успехе                            │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Настройка GitHub Pages

### Шаг 1: Включить GitHub Pages
1. Открой репозиторий на GitHub
2. Settings → Pages
3. Source: выбери "GitHub Actions"
4. Save

### Шаг 2: Сделать push
```bash
git add .
git commit -m "Add CI/CD pipelines"
git push origin main
```

### Шаг 3: Проверить статус
1. Зайди в Actions tab
2. Увидишь запущенный workflow
3. Дождись зелёной галочки ✅

### Шаг 4: Открыть сайт
Сайт будет доступен по адресу:
```
https://levivaa.github.io/ServiceDesk/
```

---

## 🐳 Использование Docker образов

### Скачать образы:
```bash
# Backend
docker pull ghcr.io/levivaa/servicedesk/backend:latest

# Frontend
docker pull ghcr.io/levivaa/servicedesk/frontend:latest
```

### Запустить на сервере:
```bash
# Используй docker-compose.yml с образами из registry
docker-compose up -d
```

---

## 📈 Мониторинг CI/CD

### Где смотреть статус:
1. **Actions tab** - все запуски workflows
2. **Commits** - статус рядом с каждым коммитом (✅ или ❌)
3. **Pull Requests** - автоматические проверки перед мержем

### Что означают статусы:
- 🟡 **Pending** - выполняется
- ✅ **Success** - успешно
- ❌ **Failed** - ошибка (нужно исправить)
- ⚪ **Skipped** - пропущен

---

## 🎓 Преимущества CI/CD

### Для разработки:
- ✅ Автоматическое тестирование
- ✅ Раннее обнаружение ошибок
- ✅ Стандартизация процесса
- ✅ История всех изменений

### Для деплоя:
- ✅ Один клик для публикации
- ✅ Откат к предыдущей версии
- ✅ Нет ручных ошибок
- ✅ Быстрая доставка фич

### Для команды:
- ✅ Прозрачность процесса
- ✅ Автоматические code review checks
- ✅ Документированный процесс
- ✅ Меньше времени на рутину

---

## 🔐 Secrets и переменные окружения

Для безопасного хранения паролей и ключей:

1. Settings → Secrets and variables → Actions
2. New repository secret
3. Добавь:
   - `DATABASE_URL` - строка подключения к БД
   - `SECRET_KEY` - секретный ключ для JWT
   - `OPENAI_API_KEY` - ключ OpenAI

Использование в workflow:
```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  SECRET_KEY: ${{ secrets.SECRET_KEY }}
```

---

## 📝 Следующие шаги

### Для production деплоя:
1. Настрой сервер (AWS, DigitalOcean, Heroku)
2. Добавь SSH ключи в GitHub Secrets
3. Создай deployment workflow
4. Настрой домен

### Для улучшения CI:
1. Добавь unit тесты
2. Добавь integration тесты
3. Настрой code coverage
4. Добавь автоматический changelog

---

## 🆘 Troubleshooting

### Workflow не запускается:
- Проверь что файл в `.github/workflows/`
- Проверь синтаксис YAML
- Проверь что push в правильную ветку

### Build падает:
- Посмотри логи в Actions tab
- Проверь что все зависимости установлены
- Проверь переменные окружения

### GitHub Pages не работает:
- Проверь что Pages включены в Settings
- Проверь что выбран "GitHub Actions" как source
- Подожди 5-10 минут после первого деплоя

---

## 📚 Полезные ссылки

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Docker Documentation](https://docs.docker.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
