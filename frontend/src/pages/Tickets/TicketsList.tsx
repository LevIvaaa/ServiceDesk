import { useEffect, useState } from 'react'
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
  message,
  Modal,
} from 'antd'
import { PlusOutlined, SearchOutlined, ClearOutlined, DownloadOutlined } from '@ant-design/icons'
import { ticketsApi, Ticket, TicketListParams } from '../../api/tickets'
import { usersApi, User } from '../../api/users'
import { departmentsApi, Department } from '../../api/departments'
import { incidentTypesApi, IncidentType } from '../../api/incidentTypes'
import { useAuthStore } from '../../store/authStore'
import CreateTicketNew from './CreateTicketNew'
import TicketDetail from './TicketDetail'
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
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [viewTicketId, setViewTicketId] = useState<number | null>(null)
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

  // Load incident types for filters
  useEffect(() => {
    const loadIncidentTypes = async () => {
      try {
        const types = await incidentTypesApi.list(true)
        setIncidentTypes(types)
      } catch (error) {
        console.error('Failed to load incident types:', error)
      }
    }
    loadIncidentTypes()
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
    low: '#52c41a',
    medium: '#fa8c16',
    high: '#f5222d',
    critical: '#8B0000',
  }

  const statusColors: Record<string, string> = {
    new: 'blue',
    in_progress: 'cyan',
    pending: 'gold',
    reviewing: 'green',
    closed: 'default',
  }

  const handleResetFilters = () => {
    setFilters({})
    setPage(1)
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      
      const exportParams = {
        status: filters.status,
        priority: filters.priority,
        incident_type: filters.incident_type,
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
        <a onClick={() => setViewTicketId(record.id)}>{text}</a>
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
      title: t('fields.station'),
      dataIndex: 'station',
      key: 'station',
      render: (station: Ticket['station']) =>
        station ? (station.station_number || station.station_id) : '-',
      width: 100,
    },
    {
      title: 'Автор',
      dataIndex: 'created_by',
      key: 'created_by',
      render: (user: Ticket['created_by']) =>
        user ? `${user.first_name} ${user.last_name}` : '-',
      width: 140,
      ellipsis: true,
    },
    {
      title: t('fields.assignedUser'),
      dataIndex: 'assigned_user',
      key: 'assigned_user',
      render: (_: any, record: Ticket) => (
        <div>
          {record.assigned_user ? (
            <>
              <div>{record.assigned_user.first_name} {record.assigned_user.last_name}</div>
              {record.assigned_department && (
                <div style={{ fontSize: 12, color: '#888' }}>{record.assigned_department.name}</div>
              )}
            </>
          ) : record.assigned_department ? (
            <div style={{ fontSize: 12, color: '#888' }}>{record.assigned_department.name}</div>
          ) : '-'}
        </div>
      ),
      width: 170,
      ellipsis: true,
    },
    {
      title: t('fields.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      width: 140,
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
              placeholder={t('priority.label')}
              allowClear
              style={{ width: '100%' }}
              value={filters.priority}
              onChange={(value) => setFilters({ ...filters, priority: value })}
            >
              {['low', 'medium', 'high', 'critical'].map((priority) => (
                <Option key={priority} value={priority}>
                  <Tag color={priorityColors[priority]} style={{ marginRight: 0 }}>{t(`priority.${priority}`)}</Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Select
              placeholder={t('filters.createdBy', 'Автор')}
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
              placeholder={'Відповідальний'}
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
          <Col xs={24} sm={12} lg={4}>
            <Select
              placeholder={'Причина звернення'}
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              value={filters.incident_type}
              onChange={(value) => setFilters({ ...filters, incident_type: value })}
            >
              {incidentTypes.map((type) => (
                <Option key={type.id} value={type.name}>
                  {type.name}
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
          onClick: () => setViewTicketId(record.id),
          style: { cursor: 'pointer' }
        })}
      />

      {/* Create Ticket Modal */}
      <Modal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width={900}
        style={{ top: 20 }}
        styles={{ 
          body: { 
            maxHeight: 'calc(100vh - 100px)', 
            overflow: 'auto',
            padding: '0 !important',
            borderRadius: 0,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          },
          content: {
            borderRadius: '15px',
            overflow: 'hidden',
            padding: 0,
          }
        }}
        className="hide-scrollbar"
        destroyOnHidden
        centered={false}
        maskClosable={false}
        keyboard={true}
        modalRender={(modal) => {
          // Set tabIndex=-1 on close button after render
          setTimeout(() => {
            const closeBtn = document.querySelector('.ant-modal-close') as HTMLElement
            if (closeBtn) {
              closeBtn.setAttribute('tabindex', '-1')
            }
          }, 0)
          return modal
        }}
      >
        <CreateTicketNew onSuccess={handleTicketCreated} isModal={true} />
      </Modal>

      {/* View Ticket Modal */}
      <Modal
        open={viewTicketId !== null}
        onCancel={() => setViewTicketId(null)}
        footer={null}
        width="95%"
        style={{ top: 20, maxWidth: 1400 }}
        styles={{
          body: {
            maxHeight: 'calc(100vh - 80px)',
            overflow: 'auto',
            padding: '16px',
            scrollbarWidth: 'thin',
          },
        }}
        destroyOnHidden
        maskClosable={false}
        keyboard={true}
      >
        {viewTicketId && (
          <TicketDetail
            ticketId={viewTicketId}
            isModal={true}
            onClose={() => setViewTicketId(null)}
            onTicketUpdated={() => fetchTickets(filters)}
          />
        )}
      </Modal>
    </div>
  )
}
