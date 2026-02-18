import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Table,
  Button,
  Tag,
  Input,
  Select,
  Typography,
  Row,
  Col,
  Card,
  Space,
  Popconfirm,
  message,
  Modal,
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ClearOutlined, DownloadOutlined } from '@ant-design/icons'
import { ticketsApi, Ticket, TicketListParams } from '../../api/tickets'
import { usersApi, User } from '../../api/users'
import { departmentsApi, Department } from '../../api/departments'
import { useAuthStore } from '../../store/authStore'
import CreateTicketNew from './CreateTicketNew'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

const FILTERS_STORAGE_KEY = 'tickets_list_filters'

// Load filters from localStorage
const loadSavedFilters = (): TicketListParams => {
  try {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load saved filters:', error)
  }
  return {}
}

// Save filters to localStorage
const saveFilters = (filters: TicketListParams) => {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
  } catch (error) {
    console.error('Failed to save filters:', error)
  }
}

export default function TicketsList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<TicketListParams>(loadSavedFilters)
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation('tickets')
  const { hasPermission } = useAuthStore()

  // Save filters when they change
  useEffect(() => {
    saveFilters(filters)
  }, [filters])

  // Load users for filters
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await usersApi.list({ is_active: true, per_page: 100 })
        setUsers(response.items)
      } catch (error) {
        console.error('Failed to load users:', error)
      }
    }
    loadUsers()
  }, [])

  // Load departments for filters
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await departmentsApi.list({ is_active: true, per_page: 100 })
        setDepartments(response.items)
      } catch (error) {
        console.error('Failed to load departments:', error)
      }
    }
    loadDepartments()
  }, [])

  const fetchTickets = async (params?: TicketListParams) => {
    try {
      setLoading(true)
      const response = await ticketsApi.list({ page, per_page: 20, ...params })
      setTickets(response.items)
      setTotal(response.total)
    } catch (error) {
      console.error('Failed to fetch tickets', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets(filters)
    // Auto-refresh every 2 seconds for near real-time updates
    const interval = setInterval(() => {
      fetchTickets(filters)
    }, 2000)
    return () => clearInterval(interval)
  }, [page, filters])

  const priorityColors: Record<string, string> = {
    low: 'green',
    medium: 'gold',
    high: 'orange',
    critical: 'red',
  }

  const statusColors: Record<string, string> = {
    new: 'blue',
    open: 'purple',
    in_progress: 'cyan',
    pending: 'gold',
    resolved: 'green',
    closed: 'default',
  }

  const handleDelete = async (ticketId: number) => {
    try {
      await ticketsApi.delete(ticketId)
      message.success(t('messages.deleted', 'Тікет видалено'))
      fetchTickets(filters)
    } catch (error) {
      message.error(t('messages.deleteError', 'Помилка видалення'))
    }
  }

  const handleResetFilters = () => {
    setFilters({})
    setPage(1)
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      
      // Filter only supported export parameters
      const exportParams = {
        status: filters.status,
        priority: filters.priority,
        category: filters.category,
        assigned_user_id: filters.assigned_user_id,
        assigned_department_id: filters.assigned_department_id,
        created_by_id: filters.created_by_id,
        search: filters.search,
      }
      
      const blob = await ticketsApi.export(exportParams)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tickets_export_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      message.success('Експорт успішно завершено')
    } catch (error) {
      message.error('Помилка експорту')
      console.error('Export error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTicketCreated = () => {
    setCreateModalOpen(false)
    fetchTickets(filters)
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '')

  const columns = [
    {
      title: t('ticketNumber'),
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      render: (text: string, record: Ticket) => (
        <a onClick={() => navigate(`/tickets/${record.id}`)}>{text}</a>
      ),
      width: 130,
    },
    {
      title: t('fields.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: 200,
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>{t('priority.label')}</span>,
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priorityColors[priority]}>{t(`priority.${priority}`)}</Tag>
      ),
      width: 110,
    },
    {
      title: t('status.label'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>{t(`status.${status}`)}</Tag>
      ),
      width: 110,
    },
    {
      title: t('category.label'),
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => t(`category.${category}`),
      width: 130,
    },
    {
      title: t('fields.station'),
      dataIndex: 'station',
      key: 'station',
      render: (station: Ticket['station']) =>
        station ? (station.station_number || station.station_id) : '-',
      width: 100,
    },
    {
      title: t('fields.assignedUser'),
      dataIndex: 'assigned_user',
      key: 'assigned_user',
      render: (user: Ticket['assigned_user']) =>
        user ? `${user.first_name} ${user.last_name}` : '-',
      width: 140,
      ellipsis: true,
    },
    {
      title: t('fields.assignedDepartment', 'Відділ'),
      dataIndex: 'assigned_department',
      key: 'assigned_department',
      render: (department: Ticket['assigned_department']) =>
        department ? department.name : '-',
      width: 140,
      ellipsis: true,
    },
    {
      title: t('fields.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      width: 140,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: Ticket) => (
        <Space size="small" direction="vertical" style={{ width: '100%' }}>
          {hasPermission('tickets.edit') && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/tickets/${record.id}`)
              }}
              title={t('common:actions.edit', 'Редагувати')}
              style={{ width: '100%', padding: '0 4px' }}
            />
          )}
          {hasPermission('tickets.delete') && (record.status === 'new' || record.status === 'closed') && (
            <Popconfirm
              title={t('messages.deleteConfirm', 'Видалити цей тікет?')}
              onConfirm={(e) => {
                e?.stopPropagation()
                handleDelete(record.id)
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText={t('common:actions.delete', 'Видалити')}
              cancelText={t('common:actions.cancel', 'Скасувати')}
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
                title={t('common:actions.delete', 'Видалити')}
                style={{ width: '100%', padding: '0 4px' }}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>{t('title')}</Title>
        </Col>
        <Col>
          <Space>
            {hasPermission('tickets.create') && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                {t('create')}
              </Button>
            )}
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={loading}
            >
              Експорт
            </Button>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={5}>
            <Input
              placeholder={t('common:actions.search')}
              prefix={<SearchOutlined />}
              allowClear
              value={filters.search || ''}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value || undefined })
              }
            />
          </Col>
          <Col xs={24} sm={12} lg={3}>
            <Select
              placeholder={t('status.label')}
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              {['new', 'open', 'in_progress', 'pending', 'resolved', 'closed'].map(
                (status) => (
                  <Option key={status} value={status}>
                    {t(`status.${status}`)}
                  </Option>
                )
              )}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={3}>
            <Select
              placeholder={t('priority.label')}
              allowClear
              style={{ width: '100%' }}
              value={filters.priority}
              onChange={(value) => setFilters({ ...filters, priority: value })}
            >
              {['low', 'medium', 'high', 'critical'].map((priority) => (
                <Option key={priority} value={priority}>
                  {t(`priority.${priority}`)}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={3}>
            <Select
              placeholder={t('category.label')}
              allowClear
              style={{ width: '100%' }}
              value={filters.category}
              onChange={(value) => setFilters({ ...filters, category: value })}
            >
              {['hardware', 'software', 'network', 'billing', 'other'].map(
                (category) => (
                  <Option key={category} value={category}>
                    {t(`category.${category}`)}
                  </Option>
                )
              )}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              placeholder={t('filters.createdBy', 'Створив')}
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              value={filters.created_by_id}
              onChange={(value) => setFilters({ ...filters, created_by_id: value })}
            >
              {users.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              placeholder={t('filters.department', 'Відділ')}
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              value={filters.assigned_department_id}
              onChange={(value) => setFilters({ ...filters, assigned_department_id: value })}
            >
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              placeholder={t('filters.assignedTo', 'Відповідальний')}
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              value={filters.assigned_user_id}
              onChange={(value) => setFilters({ ...filters, assigned_user_id: value })}
            >
              {users.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={2}>
            {hasActiveFilters && (
              <Button
                icon={<ClearOutlined />}
                onClick={handleResetFilters}
                title={t('filters.reset', 'Скинути фільтри')}
              >
                {t('filters.reset', 'Скинути')}
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={tickets}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
        }}
        scroll={{ x: 1200 }}
        onRow={(record) => ({
          onClick: () => navigate(`/tickets/${record.id}`),
          style: { cursor: 'pointer' }
        })}
      />

      {/* Create Ticket Modal */}
      <Modal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width="min(90vw, 900px)"
        centered
        styles={{ 
          body: { 
            maxHeight: '80vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '24px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          },
          content: {
            borderRadius: '15px',
            maxHeight: '85vh',
          }
        }}
        className="hide-scrollbar"
        destroyOnHidden
        centered={false}
      >
        <CreateTicketNew onSuccess={handleTicketCreated} isModal={true} />
      </Modal>
    </div>
  )
}
