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
  Popconfirm,
  Pagination,
  Divider,
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

export default function KnowledgeBase() {
  const { t, i18n } = useTranslation(['knowledge', 'common'])
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])

  const CATEGORIES = [
    { value: 'troubleshooting', label: t('category.troubleshooting') },
    { value: 'how-to', label: t('category.how-to') },
    { value: 'faq', label: t('category.faq') },
    { value: 'technical', label: t('category.technical') },
  ]
  const [searching, setSearching] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(12)

  const [modalVisible, setModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [viewingArticle, setViewingArticle] = useState<KnowledgeArticle | null>(null)
  const [form] = Form.useForm()

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const currentLanguage = i18n.language === 'uk' ? 'uk' : 'en'
      const response = await knowledgeBaseApi.list({
        page,
        per_page: perPage,
        category: selectedCategory,
        language: currentLanguage,
        is_published: true,
      })
      setArticles(response.items)
      setTotal(response.total)
    } catch (error) {
      message.error(t('messages.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!searchQuery) {
      fetchArticles()
    }
  }, [page, selectedCategory, i18n.language])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setPage(1)
      fetchArticles()
      return
    }

    setSearching(true)
    try {
      const currentLanguage = i18n.language === 'uk' ? 'uk' : 'en'
      const results = await knowledgeBaseApi.search(
        searchQuery, 
        50, 
        selectedCategory, 
        undefined, 
        currentLanguage
      )
      setSearchResults(results)
    } catch (error) {
      message.error(t('messages.searchError'))
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch()
      } else {
        setSearchResults([])
        fetchArticles()
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedCategory, i18n.language])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCategoryChange = (value: string | undefined) => {
    setSelectedCategory(value)
    setPage(1)
  }

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
      message.error(t('messages.loadError'))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await knowledgeBaseApi.delete(id)
      message.success(t('messages.articleDeleted'))
      fetchArticles()
    } catch (error) {
      message.error(t('messages.saveError'))
    }
  }

  const handleSubmit = async (values: CreateArticleData) => {
    try {
      if (editingArticle) {
        await knowledgeBaseApi.update(editingArticle.id, values)
        message.success(t('messages.articleUpdated'))
      } else {
        await knowledgeBaseApi.create(values)
        message.success(t('messages.articleCreated'))
      }
      setModalVisible(false)
      fetchArticles()
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('messages.saveError'))
    }
  }

  const handleFeedback = async (articleId: number, helpful: boolean) => {
    try {
      await knowledgeBaseApi.markHelpful(articleId, helpful)
      message.success(t('messages.feedbackThanks'))
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
          title={t('messages.deleteConfirm')}
          onConfirm={() => handleDelete(article.id)}
          okText={t('common:actions.yes')}
          cancelText={t('common:actions.no')}
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
              placeholder={i18n.language === 'en' ? 'Category' : 'Категорія'}
              value={selectedCategory}
              onChange={handleCategoryChange}
              allowClear
              options={CATEGORIES}
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading || searching}>
        {searchQuery && searchResults.length > 0 ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text strong>{t('messages.resultsFound', { count: searchResults.length })}</Text>
            </div>
            <Row gutter={[16, 16]}>
              {searchResults.map((result) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={result.article.id}>
                  <Card
                    hoverable
                    onClick={() => handleView(result.article)}
                    style={{ height: '100%' }}
                  >
                    <Card.Meta
                      avatar={<BookOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                      title={result.article.title}
                      description={
                        <>
                          <Tag color="blue">{getCategoryLabel(result.article.category)}</Tag>
                          {result.article.tags?.slice(0, 2).map(tag => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                          <Paragraph
                            ellipsis={{ rows: 3 }}
                            style={{ marginTop: 8, marginBottom: 0 }}
                          >
                            {result.snippet}
                          </Paragraph>
                        </>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        ) : searchQuery && searchResults.length === 0 && !searching ? (
          <Empty description={t('messages.noResults')} />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {articles.map(article => (
                <Col xs={24} sm={12} lg={8} xl={6} key={article.id}>
                  {renderArticleCard(article)}
                </Col>
              ))}
            </Row>
            
            {!searchQuery && total > perPage && (
              <>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                  <Pagination
                    current={page}
                    total={total}
                    pageSize={perPage}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                    showTotal={(total, range) => t('messages.articlesRange', { from: range[0], to: range[1], total })}
                  />
                </div>
              </>
            )}
          </>
        )}
      </Spin>

      {/* Create/Edit Modal */}
      <Modal
        title={editingArticle ? t('edit') : t('create')}
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
            rules={[{ required: true, message: t('validation.titleRequired') }]}
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
            rules={[{ required: true, message: t('validation.contentRequired') }]}
          >
            <TextArea rows={10} />
          </Form.Item>

          <Form.Item name="tags" label={t('fields.tags')}>
            <Select mode="tags" placeholder={t('placeholders.addTags')} />
          </Form.Item>

          <Form.Item name="error_codes" label={t('fields.errorCodes')}>
            <Select mode="tags" placeholder={t('placeholders.addErrorCodes')} />
          </Form.Item>

          <Form.Item name="is_published" valuePropName="checked">
            <Select
              options={[
                { value: true, label: t('fields.published') },
                { value: false, label: t('fields.draft') },
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
              {t('actions.markHelpful')}
            </Button>
            <Button icon={<DislikeOutlined />} onClick={() => viewingArticle && handleFeedback(viewingArticle.id, false)}>
              {t('actions.markNotHelpful')}
            </Button>
            <Button onClick={() => setViewModalVisible(false)}>
              {t('actions.close')}
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
                Автор: {viewingArticle.author?.first_name} {viewingArticle.author?.last_name} |
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
