-- Fix foreign key constraints for user deletion

-- departments.head_user_id
ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_departments_head_user_id;
ALTER TABLE departments ADD CONSTRAINT fk_departments_head_user_id 
    FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- tickets.assigned_user_id
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_assigned_user_id_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_assigned_user_id_fkey 
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- tickets.created_by_id
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_created_by_id_fkey;
ALTER TABLE tickets ADD CONSTRAINT tickets_created_by_id_fkey 
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- ticket_comments.user_id
ALTER TABLE ticket_comments DROP CONSTRAINT IF EXISTS ticket_comments_user_id_fkey;
ALTER TABLE ticket_comments ADD CONSTRAINT ticket_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ticket_attachments.uploaded_by_id
ALTER TABLE ticket_attachments DROP CONSTRAINT IF EXISTS ticket_attachments_uploaded_by_id_fkey;
ALTER TABLE ticket_attachments ADD CONSTRAINT ticket_attachments_uploaded_by_id_fkey 
    FOREIGN KEY (uploaded_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- ticket_history.user_id
ALTER TABLE ticket_history DROP CONSTRAINT IF EXISTS ticket_history_user_id_fkey;
ALTER TABLE ticket_history ADD CONSTRAINT ticket_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- notifications.user_id (CASCADE - delete notifications when user is deleted)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- audit_logs.user_id
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- knowledge_articles.author_id
ALTER TABLE knowledge_articles DROP CONSTRAINT IF EXISTS knowledge_articles_author_id_fkey;
ALTER TABLE knowledge_articles ADD CONSTRAINT knowledge_articles_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

-- knowledge_articles.last_editor_id
ALTER TABLE knowledge_articles DROP CONSTRAINT IF EXISTS knowledge_articles_last_editor_id_fkey;
ALTER TABLE knowledge_articles ADD CONSTRAINT knowledge_articles_last_editor_id_fkey 
    FOREIGN KEY (last_editor_id) REFERENCES users(id) ON DELETE SET NULL;

-- knowledge_article_versions.editor_id
ALTER TABLE knowledge_article_versions DROP CONSTRAINT IF EXISTS knowledge_article_versions_editor_id_fkey;
ALTER TABLE knowledge_article_versions ADD CONSTRAINT knowledge_article_versions_editor_id_fkey 
    FOREIGN KEY (editor_id) REFERENCES users(id) ON DELETE SET NULL;
