"""fix knowledge base foreign keys

Revision ID: 015
Revises: 014
Create Date: 2026-02-19 15:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade():
    # knowledge_articles.author_id
    op.drop_constraint('knowledge_articles_author_id_fkey', 'knowledge_articles', type_='foreignkey')
    op.create_foreign_key(
        'knowledge_articles_author_id_fkey',
        'knowledge_articles', 'users',
        ['author_id'], ['id'],
        ondelete='SET NULL'
    )
    op.alter_column('knowledge_articles', 'author_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)
    
    # knowledge_articles.last_editor_id
    op.drop_constraint('knowledge_articles_last_editor_id_fkey', 'knowledge_articles', type_='foreignkey')
    op.create_foreign_key(
        'knowledge_articles_last_editor_id_fkey',
        'knowledge_articles', 'users',
        ['last_editor_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # knowledge_article_versions.editor_id
    op.drop_constraint('knowledge_article_versions_editor_id_fkey', 'knowledge_article_versions', type_='foreignkey')
    op.create_foreign_key(
        'knowledge_article_versions_editor_id_fkey',
        'knowledge_article_versions', 'users',
        ['editor_id'], ['id'],
        ondelete='SET NULL'
    )
    op.alter_column('knowledge_article_versions', 'editor_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)


def downgrade():
    op.drop_constraint('knowledge_articles_author_id_fkey', 'knowledge_articles', type_='foreignkey')
    op.create_foreign_key(
        'knowledge_articles_author_id_fkey',
        'knowledge_articles', 'users',
        ['author_id'], ['id']
    )
    op.alter_column('knowledge_articles', 'author_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
    
    op.drop_constraint('knowledge_articles_last_editor_id_fkey', 'knowledge_articles', type_='foreignkey')
    op.create_foreign_key(
        'knowledge_articles_last_editor_id_fkey',
        'knowledge_articles', 'users',
        ['last_editor_id'], ['id']
    )
    
    op.drop_constraint('knowledge_article_versions_editor_id_fkey', 'knowledge_article_versions', type_='foreignkey')
    op.create_foreign_key(
        'knowledge_article_versions_editor_id_fkey',
        'knowledge_article_versions', 'users',
        ['editor_id'], ['id']
    )
    op.alter_column('knowledge_article_versions', 'editor_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)
