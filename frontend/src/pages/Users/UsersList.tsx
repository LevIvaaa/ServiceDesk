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
  Row,
  Col,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import { usersApi, User, CreateUserData, UpdateUserData } from '../../api/users'
import { departmentsApi, Department } from '../../api/departments'
import { rolesApi, Role } from '../../api/roles'

const { Title } = Typography

export default function UsersList() {
  const { t } = useTranslation(['users', 'common'])
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [filterDepartment, setFilterDepartment] = useState<number | undefined>()
  const [modalVisible, setModalVisible] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await usersApi.list({
        page,
        per_page: pageSize,
        search: search || undefined,
        department_id: filterDepartment,
      })
      setUsers(response.items)
      setTotal(response.total)
    } catch (error) {
      message.error('Помилка завантаження користувачів')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await departmentsApi.getAll()
      setDepartments(response)
    } catch (error) {
      // Ignore
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await rolesApi.list()
      setRoles(response)
    } catch (error) {
      // Ignore
    }
  }

  useEffect(() => {
    fetchDepartments()
    fetchRoles()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [page, pageSize, search, filterDepartment])

  const handleCreate = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue({
      ...user,
      role_ids: (user.roles || []).map(r => r.id),
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await usersApi.delete(id)
      message.success('Користувача успішно видалено')
      fetchUsers()
    } catch (error) {
      message.error('Помилка видалення користувача')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) {
        const updateData: UpdateUserData = {
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone,
          department_id: values.department_id,
          is_active: values.is_active,
          is_admin: values.is_admin,
          role_ids: values.role_ids,
        }
        await usersApi.update(editingUser.id, updateData)
        message.success('Користувача успішно оновлено')
      } else {
        const createData: CreateUserData = {
          email: values.email,
          password: values.password,
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone,
          department_id: values.department_id,
          is_active: values.is_active ?? true,
          is_admin: values.is_admin ?? false,
          role_ids: values.role_ids,
        }
        await usersApi.create(createData)
        message.success('Користувача успішно створено')
      }
      setModalVisible(false)
      fetchUsers()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Помилка збереження')
    }
  }

  const handleResetPassword = (userId: number) => {
    setSelectedUserId(userId)
    passwordForm.resetFields()
    setPasswordModalVisible(true)
  }

  const handlePasswordSubmit = async (values: { new_password: string }) => {
    if (!selectedUserId) return
    try {
      await usersApi.resetPassword(selectedUserId, values.new_password)
      message.success('Пароль успішно скинуто')
      setPasswordModalVisible(false)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Помилка скидання пароля')
    }
  }

  const columns = [
    {
      title: t('fields.fullName'),
      key: 'fullName',
      render: (_: any, record: User) => `${record.first_name} ${record.last_name}`,
    },
    {
      title: t('fields.email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('fields.phone'),
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: t('fields.department'),
      key: 'department',
      render: (_: any, record: User) => record.department?.name || '-',
    },
    {
      title: t('fields.roles'),
      key: 'roles',
      render: (_: any, record: User) => (
        <Space wrap>
          {(record.roles || []).map(role => (
            <Tag key={role.id} color="blue">{role.name}</Tag>
          ))}
          {record.is_admin && <Tag color="red">Адмін</Tag>}
        </Space>
      ),
    },
    {
      title: t('fields.status'),
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
      width: 150,
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record.id)}
            title="Скинути пароль"
          />
          <Popconfirm
            title="Видалити користувача?"
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
        <Title level={2}>{t('title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          {t('create')}
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col>
            <Input
              placeholder={t('common:actions.search')}
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder={t('fields.department')}
              value={filterDepartment}
              onChange={setFilterDepartment}
              style={{ width: 200 }}
              allowClear
              options={departments.map(d => ({ value: d.id, label: d.name }))}
            />
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={users}
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

      {/* Create/Edit User Modal */}
      <Modal
        title={editingUser ? 'Редагувати користувача' : t('create')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ is_active: true, is_admin: false }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="first_name"
                label={t('fields.firstName')}
                rules={[{ required: true, message: "Ім'я обов'язкове" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="last_name"
                label={t('fields.lastName')}
                rules={[{ required: true, message: "Прізвище обов'язкове" }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label={t('fields.email')}
            rules={[
              { required: true, message: "Email обов'язковий" },
              { type: 'email', message: 'Невірний формат email' },
            ]}
          >
            <Input />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Пароль"
              rules={[
                { required: true, message: "Пароль обов'язковий" },
                { min: 6, message: 'Мінімум 6 символів' },
              ]}
            >
              <Input.Password />
            </Form.Item>
          )}

          <Form.Item name="phone" label={t('fields.phone')}>
            <Input />
          </Form.Item>

          <Form.Item name="department_id" label={t('fields.department')}>
            <Select
              allowClear
              placeholder="Оберіть відділ"
              options={departments.map(d => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>

          <Form.Item name="role_ids" label={t('fields.roles')}>
            <Select
              mode="multiple"
              placeholder="Оберіть ролі"
              options={roles.map(r => ({ value: r.id, label: r.name }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_active" label={t('fields.status')} valuePropName="checked">
                <Switch checkedChildren="Активний" unCheckedChildren="Неактивний" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_admin" label={t('fields.isAdmin')} valuePropName="checked">
                <Switch checkedChildren="Так" unCheckedChildren="Ні" />
              </Form.Item>
            </Col>
          </Row>

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

      {/* Reset Password Modal */}
      <Modal
        title="Скинути пароль"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSubmit}>
          <Form.Item
            name="new_password"
            label="Новий пароль"
            rules={[
              { required: true, message: "Пароль обов'язковий" },
              { min: 6, message: 'Мінімум 6 символів' },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Скинути
              </Button>
              <Button onClick={() => setPasswordModalVisible(false)}>
                {t('common:actions.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
