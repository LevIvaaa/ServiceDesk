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
} from '@ant-design/icons'
import { ticketsApi, Ticket } from '../../api/tickets'
import { usersApi, User } from '../../api/users'
import { departmentsApi, Department } from '../../api/departments'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/uk'
import 'dayjs/locale/en'

dayjs.extend(relativeTime)

const { Title, Text } = Typography
const { TextArea } = Input

export default function IncomingQueue() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState('incoming')
  const [stats, setStats] = useState({ new: 0, unassigned: 0, urgent: 0, total: 0, inProgress: 0 })
  
  // Assignment modal
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [assignComment, setAssignComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('tickets')

  useEffect(() => {
    dayjs.locale(i18n.language)
  }, [i18n.language])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      
      let statusFilter = ''
      if (activeTab === 'incoming') {
        // Incoming: new and open tickets
        statusFilter = 'new,open'
      } else if (activeTab === 'inProgress') {
        // In progress: open, in_progress, pending
        statusFilter = 'open,in_progress,pending'
      } else {
        // Completed: resolved and closed
        statusFilter = 'resolved,closed'
      }
      
      const response = await ticketsApi.list({
        page,
        per_page: 20,
        status: statusFilter,
      })
      setTickets(response.items)
      setTotal(response.total)
      
      // Calculate stats based on active tab
      if (activeTab === 'incoming') {
        const newCount = response.items.filter(t => t.status === 'new').length
        const unassignedCount = response.items.filter(t => !t.assigned_user_id && !t.assigned_department_id).length
        const urgentCount = response.items.filter(t => t.priority === 'high' || t.priority === 'critical').length
        setStats({ new: newCount, unassigned: unassignedCount, urgent: urgentCount, total: response.total, inProgress: 0 })
      } else if (activeTab === 'inProgress') {
        const inProgressCount = response.items.filter(t => t.status === 'in_progress').length
        const pendingCount = response.items.filter(t => t.status === 'pending').length
        const urgentCount = response.items.filter(t => t.priority === 'high' || t.priority === 'critical').length
        setStats({ new: 0, unassigned: 0, urgent: urgentCount, total: response.total, inProgress: inProgressCount })
      } else {
        // Completed tab
        const resolvedCount = response.items.filter(t => t.status === 'resolved').length
        const closedCount = response.items.filter(t => t.status === 'closed').length
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
    const interval = setInterval(fetchTickets, 5000) // Every 5 seconds
    return () => clearInterval(interval)
  }, [page, activeTab])

  const loadDepartments = async () => {
    try {
      const response = await departmentsApi.list({ is_active: true, per_page: 100, lang: i18n.language })
      setDepartments(response.items)
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
        await ticketsApi.updateStatus(selectedTicket.id, 'open')
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
      await ticketsApi.updateStatus(ticket.id, 'in_progress', 'Прийнято в роботу')
      message.success(t('messages.statusUpdated'))
      fetchTickets()
    } catch (error) {
      message.error(t('messages.statusError'))
    }
  }

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
    pending: 'orange',
    resolved: 'green',
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
      title: t('priority.label'),
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priorityColors[priority]}>{t(`priority.${priority}`)}</Tag>
      ),
      width: 100,
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
      render: (station: Ticket['station']) => station ? station.station_id : '-',
      width: 120,
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
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/tickets/${record.id}`)}
          >
            {i18n.language === 'en' ? 'View' : 'Переглянути'}
          </Button>
          {activeTab === 'incoming' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => openAssignModal(record)}
              >
                {i18n.language === 'en' ? 'Assign' : 'Призначити'}
              </Button>
              {record.status === 'new' && (
                <Button
                  type="default"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleQuickAccept(record)}
                >
                  {i18n.language === 'en' ? 'Accept' : 'Прийняти'}
                </Button>
              )}
            </>
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
            <InboxOutlined /> {i18n.language === 'en' ? 'Tickets Queue' : 'Черга тікетів'}
          </Title>
        </Col>
      </Row>

      <Tabs 
        activeKey={activeTab} 
        onChange={(key) => {
          setActiveTab(key)
          setPage(1)
        }}
        style={{ marginBottom: 16 }}
      >
        <Tabs.TabPane 
          tab={i18n.language === 'en' ? 'Incoming' : 'Вхідні'} 
          key="incoming"
        >
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
        </Tabs.TabPane>

        <Tabs.TabPane 
          tab={i18n.language === 'en' ? 'In Progress' : 'В роботі'} 
          key="inProgress"
        >
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
        </Tabs.TabPane>

        <Tabs.TabPane 
          tab={i18n.language === 'en' ? 'Completed' : 'Завершені'} 
          key="completed"
        >
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
                  title={i18n.language === 'en' ? 'Resolved' : 'Вирішено'}
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
        </Tabs.TabPane>
      </Tabs>

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
        scroll={{ x: 1300 }}
        rowClassName={(record) => record.status === 'new' ? 'new-ticket-row' : ''}
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
                options={departments.map(d => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text>{i18n.language === 'en' ? 'Select Assignee (optional)' : 'Оберіть виконавця (необов\'язково)'}:</Text>
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
    </div>
  )
}
