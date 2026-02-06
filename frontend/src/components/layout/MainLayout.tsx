import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Avatar,
  Space,
  theme,
  Badge,
  List,
  Typography,
  Empty,
  Spin,
} from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  ApartmentOutlined,
  BookOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  CheckOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'
import { notificationsApi, Notification as NotificationType } from '../../api/notifications'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/uk'

dayjs.extend(relativeTime)
dayjs.locale('uk')

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationType[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const prevUnreadCountRef = useRef<number>(0)
  const isFirstLoadRef = useRef(true)
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { user, logout, hasPermission } = useAuthStore()
  const { token } = theme.useToken()

  // Initialize language from localStorage or default to 'ua'
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language')
    
    // Force Ukrainian as default if no valid language is saved
    if (!savedLanguage || (savedLanguage !== 'ua' && savedLanguage !== 'en')) {
      i18n.changeLanguage('ua')
      localStorage.setItem('language', 'ua')
    } else {
      i18n.changeLanguage(savedLanguage)
    }
  }, [])

  // Fetch notification count periodically
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await notificationsApi.getCount()
        const newUnreadCount = count.unread

        // Sound disabled
        // if (!isFirstLoadRef.current && newUnreadCount > prevUnreadCountRef.current) {
        //   playNotificationSound()
        // }

        prevUnreadCountRef.current = newUnreadCount
        isFirstLoadRef.current = false
        setUnreadCount(newUnreadCount)
      } catch (error) {
        console.error('Failed to fetch notifications count:', error)
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 5000) // Every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true)
      const response = await notificationsApi.list({ per_page: 10 })
      setNotifications(response.items)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setNotificationsLoading(false)
    }
  }

  const handleNotificationClick = async (notification: NotificationType) => {
    // Mark as read
    if (!notification.is_read) {
      await notificationsApi.markAsRead(notification.id)
      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      )
    }

    // Navigate to ticket if applicable
    if (notification.ticket_id) {
      setNotificationsOpen(false)
      navigate(`/tickets/${notification.ticket_id}`)
    }
  }

  const handleMarkAllAsRead = async () => {
    await notificationsApi.markAllAsRead()
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: t('menu.dashboard'),
      visible: hasPermission('tickets.create') && !user?.is_admin, // Only for senders, not admins
    },
    {
      key: hasPermission('tickets.assign') && !hasPermission('tickets.create') ? '/tickets/queue' : '/tickets',
      icon: <FileTextOutlined />,
      label: t('menu.tickets'),
      visible: !user?.is_admin, // Only for senders and handlers, not admins
    },
    {
      key: '/stations',
      icon: <ThunderboltOutlined />,
      label: t('menu.stations'),
      visible: true, // Visible for everyone
    },
    {
      key: '/operators',
      icon: <TeamOutlined />,
      label: t('menu.operators'),
      visible: hasPermission('operators.view') && hasPermission('tickets.create'), // Only for senders with permission
    },
    {
      key: '/knowledge',
      icon: <BookOutlined />,
      label: t('menu.knowledge'),
      visible: hasPermission('knowledge.view'),
    },
    {
      key: '/log-analysis',
      icon: <FileTextOutlined />,
      label: t('menu.logAnalysis'),
      visible: !user?.is_admin, // Only for senders and handlers, not admins
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: t('menu.users'),
      visible: hasPermission('users.view'), // Visible for all with permission
    },
    {
      key: '/departments',
      icon: <ApartmentOutlined />,
      label: t('menu.departments'),
      visible: hasPermission('departments.view'), // Visible for all with permission
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: t('menu.settings'),
      visible: hasPermission('settings.view') || user?.is_admin,
    },
  ]
    .filter((item) => item.visible !== false)
    .map(({ visible, ...item }) => item)

  const handleMenuClick = (key: string) => {
    navigate(key)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
    // Force reload to ensure all API calls use new language
    window.location.reload()
  }

  const languageMenu = {
    items: [
      { key: 'ua', label: t('language.uk') },
      { key: 'en', label: t('language.en') },
    ],
    onClick: ({ key }: { key: string }) => changeLanguage(key),
  }

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: t('app.profile') },
      { key: 'settings', icon: <SettingOutlined />, label: t('app.settings') },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: t('app.logout') },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') handleLogout()
      else if (key === 'settings') navigate('/settings')
    },
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className="logo">
          {collapsed ? 'EF' : 'Ecofactor'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 16px',
            background: token.colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Space>
            {/* Notifications */}
            <Dropdown
              open={notificationsOpen}
              onOpenChange={(open) => {
                setNotificationsOpen(open)
                if (open) fetchNotifications()
              }}
              popupRender={() => (
                <div
                  style={{
                    backgroundColor: token.colorBgElevated,
                    borderRadius: token.borderRadiusLG,
                    boxShadow: token.boxShadowSecondary,
                    width: 360,
                    maxHeight: 400,
                    overflow: 'auto',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: `1px solid ${token.colorBorderSecondary}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text strong>{t('notifications.title', 'Сповіщення')}</Text>
                    {unreadCount > 0 && (
                      <Button
                        type="link"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={handleMarkAllAsRead}
                      >
                        {t('notifications.markAllRead', 'Прочитати все')}
                      </Button>
                    )}
                  </div>
                  {notificationsLoading ? (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <Spin />
                    </div>
                  ) : notifications.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t('notifications.empty', 'Немає сповіщень')}
                      style={{ padding: 24 }}
                    />
                  ) : (
                    <List
                      dataSource={notifications}
                      renderItem={(item) => (
                        <List.Item
                          onClick={() => handleNotificationClick(item)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            backgroundColor: item.is_read ? 'transparent' : token.colorPrimaryBg,
                          }}
                        >
                          <List.Item.Meta
                            title={<Text strong={!item.is_read}>{item.title}</Text>}
                            description={
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {item.message}
                                </Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {dayjs(item.created_at).fromNow()}
                                </Text>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              )}
              trigger={['click']}
            >
              <Badge
                count={unreadCount}
                size="small"
                offset={[-2, 2]}
                style={{
                  backgroundColor: '#ff4d4f',
                  boxShadow: '0 0 0 1px #fff',
                }}
              >
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: 18 }} />}
                  style={{ fontSize: 18 }}
                />
              </Badge>
            </Dropdown>

            <Dropdown menu={languageMenu}>
              <Button icon={<GlobalOutlined />}>
                {i18n.language === 'en' ? 'EN' : 'UA'}
              </Button>
            </Dropdown>
            <Dropdown menu={userMenu}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>
                  {user?.first_name} {user?.last_name}
                </span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
