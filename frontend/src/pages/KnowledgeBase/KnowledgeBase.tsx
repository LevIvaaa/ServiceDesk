import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Typography,
  Input,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Select,
  message,
  Empty,
  Spin,
  List,
  Popconfirm,
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  LikeOutlined,
  DislikeOutlined,
  BookOutlined,
} from '@ant-design/icons'
import { knowledgeBaseApi, KnowledgeArticle, CreateArticleData, SearchResult } from '../../api/knowledgeBase'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const CATEGORIES = [
  { value: 'troubleshooting', label: 'Усунення несправностей' },
  { value: 'how-to', label: 'Інструкції' },
  { value: 'faq', label: 'FAQ' },
  { value: 'technical', label: 'Технічна документація' },
]

export default function KnowledgeBase() {
  const { t } = useTranslation(['knowledge', 'common'])
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [_total, setTotal] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [page, _setPage] = useState(1)

  const [modalVisible, setModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [viewingArticle, setViewingArticle] = useState<KnowledgeArticle | null>(null)
  const [form] = Form.useForm()

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const response = await knowledgeBaseApi.list({
        page,
        per_page: 12,
        category: selectedCategory,
        is_published: true,
      })
      setArticles(response.items)
      setTotal(response.total)
    } catch (error) {
      message.error('Помилка завантаження статей')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!searchQuery) {
      fetchArticles()
    }
  }, [page, selectedCategory])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      fetchArticles()
      return
    }

    setSearching(true)
    try {
      const results = await knowledgeBaseApi.search(searchQuery, 10)
      setSearchResults(results)
    } catch (error) {
      message.error('Помилка пошуку')
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch()
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const handleCreate = () => {
    setEditingArticle(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article)
    form.setFieldsValue({
      ...article,
      tags: article.tags || [],
      error_codes: article.error_codes || [],
    })
    setModalVisible(true)
  }

  const handleView = async (article: KnowledgeArticle) => {
    try {
      const fullArticle = await knowledgeBaseApi.get(article.id)
      setViewingArticle(fullArticle)
      setViewModalVisible(true)
    } catch (error) {
      message.error('Помилка завантаження статті')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await knowledgeBaseApi.delete(id)
      message.success('Статтю успішно видалено')
      fetchArticles()
    } catch (error) {
      message.error('Помилка видалення статті')
    }
  }

  const handleSubmit = async (values: CreateArticleData) => {
    try {
      if (editingArticle) {
        await knowledgeBaseApi.update(editingArticle.id, values)
        message.success('Статтю успішно оновлено')
      } else {
        await knowledgeBaseApi.create(values)
        message.success('Статтю успішно створено')
      }
      setModalVisible(false)
      fetchArticles()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Помилка збереження')
    }
  }

  const handleFeedback = async (articleId: number, helpful: boolean) => {
    try {
      await knowledgeBaseApi.markHelpful(articleId, helpful)
      message.success('Дякуємо за відгук!')
    } catch (error) {
      // Ignore feedback errors
    }
  }

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find(c => c.value === value)?.label || value
  }

  const renderArticleCard = (article: KnowledgeArticle) => (
    <Card
      key={article.id}
      hoverable
      style={{ marginBottom: 16 }}
      actions={[
        <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(article)}>
          {article.view_count}
        </Button>,
        <Button type="text" icon={<LikeOutlined />}>
          {article.helpful_count ?? 0}
        </Button>,
        <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(article)} />,
        <Popconfirm
          title="Видалити статтю?"
          onConfirm={() => handleDelete(article.id)}
          okText="Так"
          cancelText="Ні"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>,
      ]}
    >
      <Card.Meta
        title={
          <Space>
            <BookOutlined />
            <span onClick={() => handleView(article)} style={{ cursor: 'pointer' }}>
              {article.title}
            </span>
          </Space>
        }
        description={
          <>
            <Tag color="blue">{getCategoryLabel(article.category)}</Tag>
            {article.tags?.slice(0, 3).map(tag => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            <Paragraph
              ellipsis={{ rows: 2 }}
              style={{ marginTop: 8, marginBottom: 0 }}
            >
              {(article.content || '').substring(0, 200)}...
            </Paragraph>
          </>
        }
      />
    </Card>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>{t('title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          {t('create')}
        </Button>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col flex="auto">
            <Input
              size="large"
              placeholder={t('searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col>
            <Select
              size="large"
              style={{ width: 200 }}
              placeholder="Категорія"
              value={selectedCategory}
              onChange={setSelectedCategory}
              allowClear
              options={CATEGORIES}
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading || searching}>
        {searchQuery && searchResults.length > 0 ? (
          <List
            header={<Text strong>Результати пошуку ({searchResults.length})</Text>}
            dataSource={searchResults}
            renderItem={(result) => (
              <List.Item
                actions={[
                  <Button type="link" onClick={() => handleView(result.article)}>
                    Читати
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<BookOutlined style={{ fontSize: 24 }} />}
                  title={result.article.title}
                  description={
                    <>
                      <Tag color="blue">{getCategoryLabel(result.article.category)}</Tag>
                      <Text type="secondary">{result.snippet}</Text>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        ) : searchQuery && searchResults.length === 0 && !searching ? (
          <Empty description="Нічого не знайдено" />
        ) : (
          <Row gutter={[16, 16]}>
            {articles.map(article => (
              <Col xs={24} sm={12} lg={8} xl={6} key={article.id}>
                {renderArticleCard(article)}
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {/* Create/Edit Modal */}
      <Modal
        title={editingArticle ? 'Редагувати статтю' : t('create')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_published: true, category: 'troubleshooting' }}
        >
          <Form.Item
            name="title"
            label={t('fields.title')}
            rules={[{ required: true, message: "Заголовок обов'язковий" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="category"
            label={t('fields.category')}
            rules={[{ required: true }]}
          >
            <Select options={CATEGORIES} />
          </Form.Item>

          <Form.Item
            name="content"
            label={t('fields.content')}
            rules={[{ required: true, message: "Зміст обов'язковий" }]}
          >
            <TextArea rows={10} />
          </Form.Item>

          <Form.Item name="tags" label={t('fields.tags')}>
            <Select mode="tags" placeholder="Додайте теги" />
          </Form.Item>

          <Form.Item name="error_codes" label="Коди помилок">
            <Select mode="tags" placeholder="Додайте коди помилок (наприклад: ERR001)" />
          </Form.Item>

          <Form.Item name="is_published" valuePropName="checked">
            <Select
              options={[
                { value: true, label: 'Опубліковано' },
                { value: false, label: 'Чернетка' },
              ]}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {t('common:actions.save')}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                {t('common:actions.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={viewingArticle?.title}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={
          <Space>
            <Button icon={<LikeOutlined />} onClick={() => viewingArticle && handleFeedback(viewingArticle.id, true)}>
              Корисно
            </Button>
            <Button icon={<DislikeOutlined />} onClick={() => viewingArticle && handleFeedback(viewingArticle.id, false)}>
              Не корисно
            </Button>
            <Button onClick={() => setViewModalVisible(false)}>
              Закрити
            </Button>
          </Space>
        }
        width={800}
      >
        {viewingArticle && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color="blue">{getCategoryLabel(viewingArticle.category)}</Tag>
              {viewingArticle.tags?.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                Автор: {viewingArticle.author.first_name} {viewingArticle.author.last_name} |
                Переглядів: {viewingArticle.view_count} |
                Корисно: {viewingArticle.helpful_count}
              </Text>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {viewingArticle.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
