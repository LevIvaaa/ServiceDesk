# Исправление ошибки удаления пользователя

## Проблема
При удалении пользователя возникала ошибка из-за foreign key constraints в базе данных.

## ✅ Решение применено

Все foreign key constraints были обновлены:

### Обновленные таблицы:
- `departments.head_user_id` → ON DELETE SET NULL ⚠️ **ЭТО БЫЛА ОСНОВНАЯ ПРОБЛЕМА**
- `tickets.assigned_user_id` → ON DELETE SET NULL
- `tickets.created_by_id` → ON DELETE SET NULL
- `ticket_comments.user_id` → ON DELETE SET NULL
- `ticket_attachments.uploaded_by_id` → ON DELETE SET NULL
- `ticket_history.user_id` → ON DELETE SET NULL
- `notifications.user_id` → ON DELETE CASCADE
- `audit_logs.user_id` → ON DELETE SET NULL
- `knowledge_articles.author_id` → ON DELETE SET NULL
- `knowledge_articles.last_editor_id` → ON DELETE SET NULL
- `knowledge_article_versions.editor_id` → ON DELETE SET NULL

### Обновленные модели:
- `backend/app/models/audit_log.py` - добавлен `ondelete="SET NULL"` для `user_id`
- `backend/app/models/department.py` - добавлен `ondelete="SET NULL"` для `head_user_id`

## Проверка
Теперь можно удалять пользователей через интерфейс без ошибок. При удалении пользователя:
- Все ссылки на него в тикетах, комментариях, вложениях и истории будут установлены в NULL
- Уведомления пользователя будут удалены (CASCADE)
- Записи в audit_logs сохранятся, но user_id будет NULL
- Если пользователь был руководителем отдела, head_user_id будет установлен в NULL
