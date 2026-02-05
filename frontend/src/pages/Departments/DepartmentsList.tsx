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
import { useAuthStore } from '../../store/authStore'

const { Title } = Typography

export default function DepartmentsList() {
  const { t, i18n } = useTranslation(['users', 'common'])
  const { user: currentUser } = useAuthStore()
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [usersModalVisible, setUsersModalVisible] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [departmentUsers, setDepartmentUsers] = useState<User[]>([])
  const [form] = Form.useForm()

  const handleShowUsers = async (department: Department) => {
    setSelectedDepartment(department)
    // Set form values for editing department
    form.setFieldsValue({
      name: department.name,
      description: department.description,
      head_user_id: department.head_user_id,
      is_active: department.is_active,
    })
    await fetchDepartmentUsers(department.id)
    setUsersModalVisible(true)
  }

  const fetchDepartments = async () => {
    setLoading(true)
    try {
      const response = await departmentsApi.list({
        page,
        per_page: pageSize,
        search: search || undefined,
        is_active: true,
        lang: i18n.language,
      })
      setDepartments(response.items)
      setTotal(response.total)
    } catch (error) {
      message.error(t('departments.messages.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await usersApi.list({ 
        per_page: 100, 
        is_active: true,  // Only active users
        lang: i18n.language 
      })
      // Filter out users with sender role (they don't belong to departments)
      const filteredUsers = response.items.filter(user => {
        const hasSenderRole = user.roles?.some(role => role.name === 'sender')
        return !hasSenderRole
      })
      setUsers(filteredUsers)
    } catch (error) {
      // Ignore
    }
  }



  const fetchDepartmentUsers = async (departmentId: number) => {
    try {
      const response = await departmentsApi.getUsers(departmentId)
      setDepartmentUsers(response)
    } catch (error) {
      message.error(t('departments.messages.loadError'))
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [i18n.language])

  useEffect(() => {
    fetchDepartments()
  }, [page, pageSize, search, i18n.language])

  const handleCreate = () => {
    setSelectedDepartment(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await departmentsApi.delete(id)
      message.success(t('departments.messages.deleted'))
      fetchDepartments()
    } catch (error) {
      message.error(t('departments.messages.deleteError'))
    }
  }

  const handleSubmit = async (values: CreateDepartmentData) => {
    try {
      // Convert undefined to null for head_user_id
      const submitData = {
        ...values,
        head_user_id: values.head_user_id || undefined,
      }
      
      if (selectedDepartment) {
        await departmentsApi.update(selectedDepartment.id, submitData)
        message.success(t('departments.messages.updated'))
        setUsersModalVisible(false)
        setSelectedDepartment(null)
      } else {
        await departmentsApi.create(submitData)
        message.success(t('departments.messages.created'))
        setModalVisible(false)
      }
      fetchDepartments()
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('departments.messages.saveError'))
    }
  }

  const handleUpdateUser = async (userId: number, departmentId: number) => {
    try {
      // Get full user data first
      const user = departmentUsers.find(u => u.id === userId)
      if (!user) {
        message.error('Користувача не знайдено')
        return
      }

      const updateData = {
        department_id: departmentId,
        // Only include other fields if they exist
        ...(user.email && { email: user.email }),
        ...(user.first_name && { first_name: user.first_name }),
        ...(user.last_name && { last_name: user.last_name }),
        ...(user.phone && { phone: user.phone }),
        is_active: user.is_active,
        is_admin: user.is_admin,
        role_ids: (user.roles || []).map(r => r.id),
      }

      console.log('Updating user:', userId, 'with data:', updateData)
      
      await usersApi.update(userId, updateData)
      message.success(t('messages.updated'))
      
      // Refresh all data
      await fetchUsers()  // Update users list for dropdown
      if (selectedDepartment) {
        await fetchDepartmentUsers(selectedDepartment.id)
      }
      fetchDepartments()
    } catch (error: any) {
      console.error('Update error:', error)
      const errorMsg = error.response?.data?.detail || error.message || t('messages.saveError')
      message.error(errorMsg)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    try {
      await usersApi.delete(userId)
      message.success(t('messages.deleted'))
      // Refresh all data
      await fetchUsers()  // Update users list for dropdown
      if (selectedDepartment) {
        await fetchDepartmentUsers(selectedDepartment.id)
      }
      fetchDepartments()
    } catch (error) {
      message.error(t('messages.deleteError'))
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
      onHeaderCell: () => ({
        style: { whiteSpace: 'nowrap' as const },
      }),
    },
    {
      title: t('departments.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      onHeaderCell: () => ({
        style: { whiteSpace: 'nowrap' as const },
      }),
    },
    {
      title: t('departments.head'),
      key: 'head_user',
      render: (_: any, record: Department) =>
        record.head_user
          ? `${record.head_user.first_name} ${record.head_user.last_name}`
          : '-',
      onHeaderCell: () => ({
        style: { whiteSpace: 'nowrap' as const },
      }),
    },
    {
      title: t('departments.usersCount'),
      dataIndex: 'users_count',
      key: 'users_count',
      width: 120,
      align: 'center' as const,
      render: (count: number) => count ?? 0,
      onHeaderCell: () => ({
        style: { whiteSpace: 'nowrap' as const },
      }),
    },
    {
      title: t('fields.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? t('status.active') : t('status.inactive')}
        </Tag>
      ),
      onHeaderCell: () => ({
        style: { whiteSpace: 'nowrap' as const },
      }),
    },
    ...(currentUser?.is_admin ? [{
      title: t('common:actions.edit'),
      key: 'actions',
      width: 120,
      render: (_: any, record: Department) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleShowUsers(record)}
            title={t('departments.edit', 'Редагувати відділ')}
          />
          <Popconfirm
            title={t('departments.messages.deleteConfirm')}
            description={t('departments.messages.deleteDescription')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('common:actions.yes')}
            cancelText={t('common:actions.no')}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
      onHeaderCell: () => ({
        style: { whiteSpace: 'nowrap' as const },
      }),
    }] : []),
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>{t('departments.title')}</Title>
        {currentUser?.is_admin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('departments.create')}
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
        dataSource={departments}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
      />

      <Modal
        title={t('departments.create')}
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
            rules={[{ required: true, message: t('validation.nameRequired') }]}
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
              placeholder={t('placeholders.selectHead')}
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

          <Form.Item name="is_active" label={t('fields.status')} valuePropName="checked">
            <Switch checkedChildren={t('switches.active')} unCheckedChildren={t('switches.inactive')} />
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

      {/* Department Users Modal */}
      <Modal
        title={t('departments.edit')}
        open={usersModalVisible}
        onCancel={() => {
          setUsersModalVisible(false)
          setSelectedDepartment(null)
        }}
        footer={null}
        width={900}
      >
        {/* Department Edit Form */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}
        >
          <Form.Item
            name="name"
            label={t('departments.name')}
            rules={[{ required: true, message: t('validation.nameRequired') }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label={t('departments.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Space>
            <Form.Item name="head_user_id" label={t('departments.head')} style={{ marginBottom: 0, width: 250 }}>
              <Select
                allowClear
                showSearch
                placeholder={t('placeholders.selectHead')}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                onChange={(value) => {
                  // Explicitly set to null when cleared
                  form.setFieldsValue({ head_user_id: value || null })
                }}
                options={
                  // Filter users by current department
                  departmentUsers.length > 0
                    ? departmentUsers.map(u => ({
                        value: u.id,
                        label: `${u.first_name} ${u.last_name}`,
                      }))
                    : users.map(u => ({
                        value: u.id,
                        label: `${u.first_name} ${u.last_name}`,
                      }))
                }
              />
            </Form.Item>

            <Form.Item name="is_active" label={t('fields.status')} valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checkedChildren={t('switches.active')} unCheckedChildren={t('switches.inactive')} />
            </Form.Item>

            <Form.Item label=" " style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit">
                {t('common:actions.save')}
              </Button>
            </Form.Item>
          </Space>
        </Form>

        {/* Users Table */}
        <Typography.Title level={5}>{t('departments.usersIn', 'Користувачі у відділі')}</Typography.Title>
        <Table
          dataSource={departmentUsers}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
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
              title: t('fields.roles'),
              key: 'roles',
              render: (_: any, record: User) => (
                <Space wrap>
                  {(record.roles || []).map(role => (
                    <Tag key={role.id} color="blue">{t(`roles.${role.name}`)}</Tag>
                  ))}
                  {record.is_admin && <Tag color="red">{t('switches.admin')}</Tag>}
                </Space>
              ),
            },
            {
              title: t('common:actions.edit'),
              key: 'actions',
              width: 200,
              render: (_: any, record: User) => {
                const hasSenderRole = record.roles?.some(role => role.name === 'sender')
                return (
                  <Space>
                    {!hasSenderRole && (
                      <Select
                        size="small"
                        style={{ width: 120 }}
                        placeholder={t('fields.department')}
                        value={record.department_id}
                        onChange={(value) => handleUpdateUser(record.id, value)}
                        options={departments.map(d => ({ value: d.id, label: d.name }))}
                      />
                    )}
                    {hasSenderRole && (
                      <Tag color="orange">{t('roles.sender')}</Tag>
                    )}
                    <Popconfirm
                      title={t('messages.deleteConfirm')}
                      description={t('messages.deleteDescription')}
                      onConfirm={() => handleDeleteUser(record.id)}
                      okText={t('common:actions.yes')}
                      cancelText={t('common:actions.no')}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                    </Popconfirm>
                  </Space>
                )
              },
            },
          ]}
        />
      </Modal>
    </div>
  )
}
