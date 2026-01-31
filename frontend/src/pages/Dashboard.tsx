import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin } from 'antd'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import client from '../api/client'
import { ticketsApi, Ticket } from '../api/tickets'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title } = Typography

interface DashboardStats {
  tickets_by_status: Record<string, number>
  tickets_by_priority: Record<string, number>
  total_tickets: number
  open_tickets: number
  sla_breached: number
  created_today: number
  resolved_today: number
  avg_resolution_hours: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t } = useTranslation('tickets')
  const { hasPermission } = useAuthStore()

  // Redirect ticket handlers to queue page
  useEffect(() => {
    if (hasPermission('tickets.assign') && !hasPermission('tickets.create')) {
      navigate('/tickets/queue', { replace: true })
    }
  }, [hasPermission, navigate])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ticketsRes] = await Promise.all([
          client.get('/dashboard/stats'),
          ticketsApi.list({ page: 1, per_page: 10 }), // Останні 10 тікетів
        ])
        setStats(statsRes.data)
        setTickets(ticketsRes.items)
      } catch (error) {
        console.error('Failed to fetch dashboard data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Auto-refresh every 2 seconds for near real-time updates
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

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
      width: 120,
    },
    {
      title: t('fields.station'),
      dataIndex: 'station',
      key: 'station',
      render: (station: Ticket['station']) =>
        station ? station.station_id : '-',
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
      title: t('fields.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      width: 140,
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Title level={2}>{t('common:menu.dashboard')}</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.openTickets')}
              value={stats?.open_tickets || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.createdToday')}
              value={stats?.created_today || 0}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.resolvedToday')}
              value={stats?.resolved_today || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard.slaBreached')}
              value={stats?.sla_breached || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: stats?.sla_breached ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.ticketsByStatus')}>
            <Row gutter={[8, 8]}>
              {stats &&
                Object.entries(stats.tickets_by_status).map(([status, count]) => (
                  <Col span={8} key={status}>
                    <Statistic
                      title={t(`status.${status}`)}
                      value={count}
                      valueStyle={{ fontSize: 20 }}
                    />
                  </Col>
                ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.ticketsByPriority')}>
            <Row gutter={[8, 8]}>
              {stats &&
                Object.entries(stats.tickets_by_priority).map(([priority, count]) => (
                  <Col span={6} key={priority}>
                    <Statistic
                      title={
                        <Tag color={priorityColors[priority]}>
                          {t(`priority.${priority}`)}
                        </Tag>
                      }
                      value={count}
                      valueStyle={{ fontSize: 20 }}
                    />
                  </Col>
                ))}
            </Row>
          </Card>
        </Col>
      </Row>

      <Card title={t('dashboard.myTickets')} style={{ marginTop: 24 }}>
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  )
}
