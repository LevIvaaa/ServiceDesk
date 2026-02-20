import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Table,
  Button,
  Tag,
  Typography,
  Row,
  Col,
  Card,
  Space,
  message,
  Modal,
  Select,
  Input,
  Statistic,
  Badge,
  Tooltip,
  Tabs,
} from 'antd'
import {
  InboxOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FireOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  ClearOutlined,
} from '@ant-design/icons'
import { ticketsApi, Ticket, TicketListParams } from '../../api/tickets'
import { usersApi, User } from '../../api/users'
import { departmentsApi, Department } from '../../api/departments'
import { useAuthStore } from '../../store/authStore'
import CreateTicketNew from './CreateTicketNew'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/uk'
import 'dayjs/locale/en'

dayjs.extend(relativeTime)

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const FILTERS_STORAGE_KEY = 'tickets_list_filters'

const loadSavedFilters = (): TicketListParams => {
  try {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch (error) {}
  return {}
}

const saveFilters = (filters: TicketListParams) => {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
  } catch (error) {}
}

export default function IncomingQueue() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState('all')
  const [stats, setStats] = useState({ new: 0, unassigned: 0, urgent: 0, total: 0, inProgress: 0 })
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<number | undefined>(undefined)
  
  // Assignment modal
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [assignDepartments, setAssignDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [assignComment, setAssignComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('tickets')
  const { user: currentUser, hasPermission } = useAuthStore()

  // Filters & create modal state
  const [filters, setFilters] = useState<TicketListParams>(loadSavedFilters)
  const [filterUsers, setFilterUsers] = useState<User[]>([])
  const [filterDepartments, setFilterDepartments] = useState<Department[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    dayjs.locale(i18n.language)
  }, [i18n.language])

  // Save filters when they change
  useEffect(() => {
    saveFilters(filters)
  }, [filters])

  // Load users for filters
  useEffect(() => {
    const loadFilterUsers = async () => {
      try {
        const response = await usersApi.list({ is_active: true, per_page: 100 })
        setFilterUsers(response.items)
      } catch (error) {}
    }
    loadFilterUsers()
  }, [])

  // Load departments for filters
  useEffect(() => {
    const loadFilterDepartments = async () => {
      try {
        const response = await departmentsApi.list({ is_active: true, per_page: 100, lang: i18n.language })
        setFilterDepartments(response.items)
      } catch (error) {}
    }
    loadFilterDepartments()
  }, [i18n.language])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      
      let statusFilter = ''
      let departmentFilter: number | undefined = undefined
      
      if (activeTab === 'all') {
        // All tickets: apply user filters
        statusFilter = filters.status || ''
        departmentFilter = filters.assigned_department_id || selectedDepartmentFilter
      } else if (activeTab === 'incoming') {
        // Incoming: ALL new tickets for current user's department
        statusFilter = 'new'
        departmentFilter = currentUser?.department_id || undefined
      } else if (activeTab === 'inProgress') {
        // In progress: in_progress and pending for current user's department
        statusFilter = 'in_progress,pending'
        departmentFilter = currentUser?.department_id || undefined
      } else if (activeTab === 'myTickets') {
        // My tickets: all active tickets assigned to current user
        statusFilter = 'new,in_progress,pending,reviewing'
        departmentFilter = undefined // Don't filter by department, filter by user below
      } else {
        // Completed: reviewing and closed for current user's department
        statusFilter = 'reviewing,closed'
        departmentFilter = currentUser?.department_id || undefined
      }
      
      const response = await ticketsApi.list({
        page,
        per_page: 20,
        status: statusFilter || undefined,
        department_id: departmentFilter,
        assigned_user_id: activeTab === 'myTickets' ? currentUser?.id : (activeTab === 'all' ? filters.assigned_user_id : undefined),
        search: activeTab === 'all' ? filters.search : undefined,
        priority: activeTab === 'all' ? filters.priority : undefined,
        category: activeTab === 'all' ? filters.category : undefined,
        created_by_id: activeTab === 'all' ? filters.created_by_id : undefined,
      })
      
      setTickets(response.items)
      setTotal(response.total)
      
      // Calculate stats based on active tab
      if (activeTab === 'all') {
        const newCount = response.items.filter(t => t.status === 'new').length
        const inProgressCount = response.items.filter(t => t.status === 'in_progress').length
        const urgentCount = response.items.filter(t => t.priority === 'high' || t.priority === 'critical').length
        setStats({ new: newCount, unassigned: 0, urgent: urgentCount, total: response.total, inProgress: inProgressCount })
      } else if (activeTab === 'incoming') {
        const newCount = response.items.filter(t => t.status === 'new').length
        const unassignedCount = response.items.filter(t => !t.assigned_user_id && !t.assigned_department_id).length
        const urgentCount = response.items.filter(t => t.priority === 'high' || t.priority === 'critical').length
        setStats({ new: newCount, unassigned: unassignedCount, urgent: urgentCount, total: response.total, inProgress: 0 })
      } else if (activeTab === 'inProgress') {
        const inProgressCount = response.items.filter(t => t.status === 'in_progress').length
        const urgentCount = response.items.filter(t => t.priority === 'high' || t.priority === 'critical').length
        setStats({ new: 0, unassigned: 0, urgent: urgentCount, total: response.total, inProgress: inProgressCount })
      } else if (activeTab === 'myTickets') {
        const inProgressCount = response.items.filter(t => t.status === 'in_progress').length
        const urgentCount = response.items.filter(t => t.priority === 'high' || t.priority === 'critical').length
        setStats({ new: 0, unassigned: 0, urgent: urgentCount, total: response.total, inProgress: inProgressCount })
      } else {
        // Completed tab
        const resolvedCount = response.items.filter(t => t.status === 'reviewing').length
        setStats({ new: 0, unassigned: 0, urgent: 0, total: response.total, inProgress: resolvedCount })
      }
    } catch (error) {
      message.error(t('messages.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
    const interval = setInterval(fetchTickets, 3000)
    return () => clearInterval(interval)
  }, [page, activeTab, selectedDepartmentFilter, filters])

  const loadDepartments = async () => {
    try {
      const response = await departmentsApi.list({ is_active: true, per_page: 100, lang: i18n.language })
      setAssignDepartments(response.items)
    } catch (error) {
      console.error('Failed to load departments:', error)
    }
  }

  const loadUsers = async (departmentId?: number) => {
    try {
      const params: any = { is_active: true, per_page: 100, lang: i18n.language }
      if (departmentId) {
        params.department_id = departmentId
      }
      const response = await usersApi.list(params)
      setUsers(response.items)
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const openAssignModal = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setSelectedDepartmentId(ticket.assigned_department_id || null)
    setSelectedUserId(ticket.assigned_user_id || null)
    setAssignComment('')
    loadDepartments()
    loadUsers(ticket.assigned_department_id || undefined)
    setAssignModalVisible(true)
  }

  const handleDepartmentChange = (departmentId: number | undefined) => {
    setSelectedDepartmentId(departmentId || null)
    setSelectedUserId(null)
    if (departmentId) {
      loadUsers(departmentId)
    } else {
      loadUsers()
    }
  }

  const handleAssign = async () => {
    if (!selectedTicket) return
    try {
      setSubmitting(true)

      if (selectedDepartmentId) {
        await ticketsApi.delegate(
          selectedTicket.id,
          selectedDepartmentId,
          selectedUserId || undefined,
          assignComment || undefined
        )
      } else if (selectedUserId) {
        await ticketsApi.assign(selectedTicket.id, selectedUserId, assignComment || undefined)
      }

      if (selectedTicket.status === 'new') {
        await ticketsApi.updateStatus(selectedTicket.id, 'in_progress')
      }

      setAssignModalVisible(false)
      message.success(t('messages.assigned'))
      fetchTickets()
    } catch (error) {
      message.error(t('messages.assignError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickAccept = async (ticket: Ticket) => {
    try {
      if (!ticket.assigned_user_id && currentUser) {
        await ticketsApi.assign(ticket.id, currentUser.id, 'Прийнято в роботу')
      }
      await ticketsApi.updateStatus(ticket.id, 'in_progress', 'Прийнято в роботу')
      message.success(i18n.language === 'en' 
        ? 'Ticket accepted and moved to "In Progress"' 
        : 'Тікет прийнято і переміщено у "В роботі"')
      fetchTickets()
    } catch (error) {
      message.error(t('messages.statusError'))
    }
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
        category: filters.category,
        assigned_user_id: filters.assigned_user_id,
        assigned_department_id: filters.assigned_department_id,
        created_by_id: filters.created_by_id,
        search: filters.search,
      }
      const blob = await ticketsApi.export(exportParams)
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
    } finally {
      setLoading(false)
    }
  }

  const handleTicketCreated = () => {
    setCreateModalOpen(false)
    fetchTickets()
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '')

  const priorityColors: Record<string, string> = {
    low: 'green',
    medium: 'gold',
    high: 'orange',
    critical: 'red',
  }

  const statusColors: Record<string, string> = {
    new: 'blue',
    in_progress: 'cyan',
    pending: 'gold',
    reviewing: 'green',
    closed: 'default',
  }

  const getPriorityIcon = (priority: string) => {
    if (priority === 'critical') return <FireOutlined style={{ color: '#ff4d4f' }} />
    if (priority === 'high') return <WarningOutlined style={{ color: '#faad14' }} />
    return null
  }

  const columns = [
    {
      title: t('ticketNumber'),
      dataIndex: 'ticket_number',
      key: 'ticket_number',
      render: (text: string, record: Ticket) => (
        <Space>
          {getPriorityIcon(record.priority)}
          <a onClick={() => navigate(`/tickets/${record.id}`)}>{text}</a>
        </Space>
      ),
      width: 150,
    },
    {
      title: t('fields.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: Ticket) => (
        <div>
          <div>{text}</div>
          {activeTab === 'incoming' && record.status === 'new' && (
            <Badge status="processing" text={i18n.language === 'en' ? 'New' : 'Новий'} />
          )}
          {(activeTab === 'inProgress' || activeTab === 'completed') && (
            <Tag color={statusColors[record.status] || 'default'}>
              {t(`status.${record.status}`)}
            </Tag>
          )}
        </div>
      ),
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
      render: (station: Ticket['station']) => station ? (station.station_number || station.station_id) : '-',
      width: 120,
    },
    {
      title: i18n.language === 'en' ? 'Department' : 'Відділ',
      dataIndex: 'assigned_department',
      key: 'assigned_department',
      render: (department: Ticket['assigned_department']) => department?.name || '-',
      width: 150,
    },
    {
      title: activeTab === 'incoming' 
        ? (i18n.language === 'en' ? 'Created By' : 'Створив')
        : (i18n.language === 'en' ? 'Assigned To' : 'Призначено'),
      dataIndex: activeTab === 'incoming' ? 'created_by' : 'assigned_user',
      key: activeTab === 'incoming' ? 'created_by' : 'assigned_user',
      render: (user: Ticket['created_by'] | Ticket['assigned_user']) =>
        user ? `${user.first_name} ${user.last_name}` : '-',
      width: 150,
    },
    {
      title: activeTab === 'completed'
        ? (i18n.language === 'en' ? 'Resolved At' : 'Вирішено')
        : (i18n.language === 'en' ? 'Waiting' : 'Очікує'),
      dataIndex: activeTab === 'completed' ? 'resolved_at' : 'created_at',
      key: activeTab === 'completed' ? 'resolved_at' : 'waiting_time',
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('DD.MM.YYYY HH:mm')}>
          <Text type="secondary">{dayjs(date).fromNow()}</Text>
        </Tooltip>
      ),
      width: 120,
    },
    {
      title: i18n.language === 'en' ? 'Actions' : 'Дії',
      key: 'actions',
      width: activeTab === 'completed' ? 120 : 220,
      fixed: 'right' as const,
      render: (_: any, record: Ticket) => (
        <Space size="small">
          {activeTab === 'incoming' && (
            <>
              {(record.status === 'new') && (
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleQuickAccept(record)}
                >
                  {i18n.language === 'en' ? 'Accept' : 'Прийняти'}
                </Button>
              )}
              <Button
                type="default"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => openAssignModal(record)}
              >
                {i18n.language === 'en' ? 'Assign' : 'Призначити'}
              </Button>
            </>
          )}
          {activeTab === 'all' && (
            <>
              {(record.status === 'new') && 
               record.assigned_department_id === currentUser?.department_id && (
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleQuickAccept(record)}
                >
                  {i18n.language === 'en' ? 'Accept' : 'Прийняти'}
                </Button>
              )}
              <Button
                type="default"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate(`/tickets/${record.id}`)}
              >
                {i18n.language === 'en' ? 'View' : 'Переглянути'}
              </Button>
            </>
          )}
          {(activeTab === 'inProgress' || activeTab === 'myTickets' || activeTab === 'completed') && (
            <Button
              type="default"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/tickets/${record.id}`)}
            >
              {i18n.language === 'en' ? 'View' : 'Переглянути'}
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>
            {t('title', 'Тікети')}
          </Title>
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

      {/* Filters */}
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
              {['new', 'in_progress', 'pending', 'reviewing', 'closed'].map(
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
              {filterUsers.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} lg={3}>
            <Select
              placeholder={t('filters.department', 'Відділ')}
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              value={filters.assigned_department_id}
              onChange={(value) => setFilters({ ...filters, assigned_department_id: value })}
            >
              {filterDepartments.map((dept) => (
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
              >
                {t('filters.reset', 'Скинути')}
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      <Tabs 
        activeKey={activeTab} 
        onChange={(key) => {
          setActiveTab(key)
          setPage(1)
          // Reset department filter when switching tabs
          if (key !== 'all') {
            setSelectedDepartmentFilter(undefined)
          }
        }}
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'all',
            label: i18n.language === 'en' ? 'All' : 'Всі',
            children: (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Total Tickets' : 'Всього тікетів'}
                      value={stats.total}
                      prefix={<InboxOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'New' : 'Нові'}
                      value={stats.new}
                      prefix={<Badge status="processing" />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'In Progress' : 'В роботі'}
                      value={stats.inProgress}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Urgent' : 'Термінові'}
                      value={stats.urgent}
                      prefix={<WarningOutlined />}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'incoming',
            label: i18n.language === 'en' ? 'Incoming' : 'Вхідні',
            children: (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Total Incoming' : 'Всього вхідних'}
                      value={stats.total}
                      prefix={<InboxOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'New Tickets' : 'Нові тікети'}
                      value={stats.new}
                      prefix={<Badge status="processing" />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Unassigned' : 'Не призначені'}
                      value={stats.unassigned}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Urgent' : 'Термінові'}
                      value={stats.urgent}
                      prefix={<WarningOutlined />}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'inProgress',
            label: i18n.language === 'en' ? 'In Progress' : 'В роботі',
            children: (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Total In Progress' : 'Всього в роботі'}
                      value={stats.total}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'In Progress' : 'В процесі'}
                      value={stats.inProgress}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Urgent' : 'Термінові'}
                      value={stats.urgent}
                      prefix={<WarningOutlined />}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'myTickets',
            label: i18n.language === 'en' ? 'My Tickets' : 'Мої тікети',
            children: (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'My Tickets' : 'Мої тікети'}
                      value={stats.total}
                      prefix={<UserAddOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'In Progress' : 'В процесі'}
                      value={stats.inProgress}
                      prefix={<ClockCircleOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Urgent' : 'Термінові'}
                      value={stats.urgent}
                      prefix={<FireOutlined />}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'completed',
            label: i18n.language === 'en' ? 'Completed' : 'Завершені',
            children: (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Total Completed' : 'Всього завершених'}
                      value={stats.total}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Reviewing' : 'Перевіряється'}
                      value={stats.inProgress}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title={i18n.language === 'en' ? 'Closed' : 'Закрито'}
                      value={stats.total - stats.inProgress}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: '#8c8c8c' }}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

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
          showTotal: (total) => i18n.language === 'en' ? `Total: ${total}` : `Всього: ${total}`,
        }}
        scroll={{ x: 1450 }}
        rowClassName={(record) => record.status === 'new' ? 'new-ticket-row' : ''}
        onRow={(record) => ({
          onClick: () => navigate(`/tickets/${record.id}`),
          style: { cursor: 'pointer' }
        })}
      />

      <Modal
        title={i18n.language === 'en' ? 'Assign Ticket' : 'Призначити тікет'}
        open={assignModalVisible}
        onOk={handleAssign}
        onCancel={() => setAssignModalVisible(false)}
        confirmLoading={submitting}
        okText={i18n.language === 'en' ? 'Assign' : 'Призначити'}
        cancelText={i18n.language === 'en' ? 'Cancel' : 'Скасувати'}
        width={600}
      >
        {selectedTicket && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>{t('ticketNumber')}:</Text> {selectedTicket.ticket_number}
              <br />
              <Text strong>{t('fields.title')}:</Text> {selectedTicket.title}
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text>{i18n.language === 'en' ? 'Select Department' : 'Оберіть відділ'}:</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder={i18n.language === 'en' ? 'Select department' : 'Оберіть відділ'}
                allowClear
                value={selectedDepartmentId}
                onChange={handleDepartmentChange}
                options={assignDepartments.map(d => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text>{i18n.language === 'en' ? 'Select Assignee' : 'Оберіть виконавця'}:</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder={i18n.language === 'en' ? 'Select user' : 'Оберіть користувача'}
                allowClear
                showSearch
                optionFilterProp="children"
                value={selectedUserId}
                onChange={setSelectedUserId}
                disabled={!selectedDepartmentId}
                options={users.map(u => ({
                  value: u.id,
                  label: `${u.first_name} ${u.last_name}`,
                }))}
              />
            </div>

            <div>
              <Text>{i18n.language === 'en' ? 'Comment (optional)' : 'Коментар (необов\'язково)'}:</Text>
              <TextArea
                rows={3}
                value={assignComment}
                onChange={(e) => setAssignComment(e.target.value)}
                placeholder={i18n.language === 'en' ? 'Add a comment...' : 'Додайте коментар...'}
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .new-ticket-row {
          background-color: #e6f7ff;
        }
      `}</style>

      {/* Create Ticket Modal */}
      <Modal
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        width={580}
        styles={{ 
          body: { 
            maxHeight: 'calc(100vh - 120px)', 
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
        centered={true}
        maskClosable={false}
        keyboard={true}
        modalRender={(modal) => {
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
    </div>
  )
}
