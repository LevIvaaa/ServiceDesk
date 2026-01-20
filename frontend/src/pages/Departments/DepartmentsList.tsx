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
  Select,
  message,
  Popconfirm,
  Card,
  Switch,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { departmentsApi, Department, CreateDepartmentData } from '../../api/departments'
import { usersApi, User } from '../../api/users'

const { Title } = Typography

export default function DepartmentsList() {
  const { t } = useTranslation(['users', 'common'])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [form] = Form.useForm()

  const fetchDepartments = async () => {
    setLoading(true)
    try {
      const response = await departmentsApi.list({
        page,
        per_page: pageSize,
        search: search || undefined,
      })
      setDepartments(response.items)
      setTotal(response.total)
    } catch (error) {
      message.error('Помилка завантаження відділів')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await usersApi.list({ per_page: 100 })
      setUsers(response.items)
    } catch (error) {
      // Ignore
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    fetchDepartments()
  }, [page, pageSize, search])

  const handleCreate = () => {
    setEditingDepartment(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (department: Department) => {
    setEditingDepartment(department)
    form.setFieldsValue(department)
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await departmentsApi.delete(id)
      message.success('Відділ успішно видалено')
      fetchDepartments()
    } catch (error) {
      message.error('Помилка видалення відділу')
    }
  }

  const handleSubmit = async (values: CreateDepartmentData) => {
    try {
      if (editingDepartment) {
        await departmentsApi.update(editingDepartment.id, values)
        message.success('Відділ успішно оновлено')
      } else {
        await departmentsApi.create(values)
        message.success('Відділ успішно створено')
      }
      setModalVisible(false)
      fetchDepartments()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Помилка збереження')
    }
  }

  const columns = [
    {
      title: t('departments.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <TeamOutlined />
          {name}
        </Space>
      ),
    },
    {
      title: t('departments.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: t('departments.head'),
      key: 'head_user',
      render: (_: any, record: Department) =>
        record.head_user
          ? `${record.head_user.first_name} ${record.head_user.last_name}`
          : '-',
    },
    {
      title: t('departments.usersCount'),
      dataIndex: 'users_count',
      key: 'users_count',
      width: 120,
      align: 'center' as const,
      render: (count: number) => count ?? 0,
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активний' : 'Неактивний'}
        </Tag>
      ),
    },
    {
      title: t('common:actions.edit'),
      key: 'actions',
      width: 120,
      render: (_: any, record: Department) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Видалити відділ?"
            description="Ця дія незворотна"
            onConfirm={() => handleDelete(record.id)}
            okText="Так"
            cancelText="Ні"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>{t('departments.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          {t('departments.create')}
        </Button>
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
        dataSource={departments}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `Всього: ${total}`,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
      />

      <Modal
        title={editingDepartment ? 'Редагувати відділ' : t('departments.create')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label={t('departments.name')}
            rules={[{ required: true, message: "Назва обов'язкова" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label={t('departments.description')}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="head_user_id" label={t('departments.head')}>
            <Select
              allowClear
              showSearch
              placeholder="Оберіть керівника"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={users.map(u => ({
                value: u.id,
                label: `${u.first_name} ${u.last_name} (${u.email})`,
              }))}
            />
          </Form.Item>

          <Form.Item name="is_active" label="Статус" valuePropName="checked">
            <Switch checkedChildren="Активний" unCheckedChildren="Неактивний" />
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
