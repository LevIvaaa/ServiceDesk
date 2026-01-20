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

interface MyTicket {
  id: number
  ticket_number: string
  title: string
  priority: string
  status: string
  created_at: string
  sla_due_date: string | null
  sla_breached: boolean
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [myTickets, setMyTickets] = useState<MyTicket[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t } = useTranslation('tickets')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ticketsRes] = await Promise.all([
          client.get('/dashboard/stats'),
          client.get('/dashboard/my-tickets'),
        ])
        setStats(statsRes.data)
        setMyTickets(ticketsRes.data)
      } catch (error) {
        console.error('Failed to fetch dashboard data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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
      render: (text: string, record: MyTicket) => (
        <a onClick={() => navigate(`/tickets/${record.id}`)}>{text}</a>
      ),
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
    },
    {
      title: t('status.label'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>{t(`status.${status}`)}</Tag>
      ),
    },
    {
      title: 'SLA',
      dataIndex: 'sla_breached',
      key: 'sla',
      render: (breached: boolean) =>
        breached ? (
          <Tag color="red" icon={<WarningOutlined />}>
            Breached
          </Tag>
        ) : null,
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
              title="Open Tickets"
              value={stats?.open_tickets || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Created Today"
              value={stats?.created_today || 0}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Resolved Today"
              value={stats?.resolved_today || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="SLA Breached"
              value={stats?.sla_breached || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: stats?.sla_breached ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Tickets by Status">
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
          <Card title="Tickets by Priority">
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

      <Card title="My Tickets" style={{ marginTop: 24 }}>
        <Table
          columns={columns}
          dataSource={myTickets}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}
