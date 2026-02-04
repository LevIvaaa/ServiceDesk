import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Typography,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Modal,
  Form,
  message,
  Popconfirm,
  Card,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { operatorsApi, Operator, CreateOperatorData } from '../../api/operators'
import { useAuthStore } from '../../store/authStore'

const { Title } = Typography

export default function OperatorsList() {
  const { t } = useTranslation(['stations', 'common'])
  const { user: currentUser } = useAuthStore()
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null)
  const [form] = Form.useForm()

  const fetchOperators = async () => {
    setLoading(true)
    try {
      const response = await operatorsApi.list({
        page,
        per_page: pageSize,
        search: search || undefined,
      })
      setOperators(response.items)
      setTotal(response.total)
    } catch (error) {
      message.error(t('operators.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOperators()
  }, [page, pageSize, search])

  const handleCreate = () => {
    setEditingOperator(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (operator: Operator) => {
    setEditingOperator(operator)
    form.setFieldsValue(operator)
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await operatorsApi.delete(id)
      message.success(t('operators.deleted'))
      fetchOperators()
    } catch (error) {
      message.error(t('operators.deleteError'))
    }
  }

  const handleSubmit = async (values: CreateOperatorData) => {
    try {
      if (editingOperator) {
        await operatorsApi.update(editingOperator.id, values)
        message.success(t('operators.updated'))
      } else {
        await operatorsApi.create(values)
        message.success(t('operators.created'))
      }
      setModalVisible(false)
      fetchOperators()
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('operators.saveError'))
    }
  }

  const columns = [
    {
      title: t('operators.name'),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
    },
    {
      title: t('operators.code'),
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: t('operators.contactEmail'),
      dataIndex: 'contact_email',
      key: 'contact_email',
    },
    {
      title: t('operators.contactPhone'),
      dataIndex: 'contact_phone',
      key: 'contact_phone',
    },
    {
      title: t('operators.stationsCount'),
      dataIndex: 'stations_count',
      key: 'stations_count',
      width: 100,
      align: 'center' as const,
    },
    {
      title: t('operators.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? t('operators.active') : t('operators.inactive')}
        </Tag>
      ),
    },
    ...(currentUser?.is_admin ? [{
      title: t('common:actions.edit'),
      key: 'actions',
      width: 120,
      render: (_: any, record: Operator) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title={t('operators.deleteConfirm')}
            description={t('operators.deleteDescription')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common:actions.yes')}
            cancelText={t('common:actions.no')}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>{t('operators.title')}</Title>
        {currentUser?.is_admin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('operators.create')}
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Input
          placeholder={t('common:actions.search')}
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
      </Card>

      <Table
        columns={columns}
        dataSource={operators}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => t('common:table.total', { total }),
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
      />

      <Modal
        title={editingOperator ? t('operators.edit') : t('operators.create')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label={t('operators.name')}
            rules={[{ required: true, message: t('operators.nameRequired') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="code"
            label={t('operators.code')}
            rules={[{ required: true, message: t('operators.codeRequired') }]}
          >
            <Input disabled={!!editingOperator} />
          </Form.Item>

          <Form.Item name="contact_email" label={t('operators.contactEmail')}>
            <Input type="email" />
          </Form.Item>

          <Form.Item name="contact_phone" label={t('operators.contactPhone')}>
            <Input />
          </Form.Item>

          <Form.Item name="api_endpoint" label={t('operators.apiEndpoint')}>
            <Input />
          </Form.Item>

          <Form.Item name="notes" label={t('operators.notes')}>
            <Input.TextArea rows={3} />
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
    </div>
  )
}
