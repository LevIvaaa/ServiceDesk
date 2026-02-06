import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Typography,
  Card,
  Form,
  Input,
  Switch,
  Button,
  Select,
  message,
  Tabs,
  Space,
  Divider,
  Row,
  Col,
} from 'antd'
import {
  UserOutlined,
  BellOutlined,
  GlobalOutlined,
  LockOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'
import client from '../../api/client'

const { Title, Text } = Typography

interface NotificationSettings {
  email_enabled: boolean
  telegram_enabled: boolean
  telegram_chat_id: string | null
  notify_ticket_created: boolean
  notify_ticket_assigned: boolean
  notify_ticket_status_changed: boolean
  notify_ticket_commented: boolean
  notify_ticket_sla_warning: boolean
  notify_ticket_escalated: boolean
  language: string
}

interface ProfileData {
  first_name: string
  last_name: string
  phone: string | null
}

export default function Settings() {
  const { t, i18n } = useTranslation(['settings', 'users', 'common'])
  const { user, setUser } = useAuthStore()
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [notificationForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [_notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
      })
    }
    fetchNotificationSettings()
  }, [user])

  const fetchNotificationSettings = async () => {
    try {
      const response = await client.get('/users/me/notifications')
      setNotificationSettings(response.data)
      notificationForm.setFieldsValue(response.data)
    } catch (error) {
      // Settings might not exist yet
    }
  }

  const handleProfileUpdate = async (values: ProfileData) => {
    setLoading(true)
    try {
      const response = await client.put('/users/me', values)
      setUser(response.data)
      message.success(t('profile.updated'))
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('profile.updateError'))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (values: { current_password: string; new_password: string }) => {
    setLoading(true)
    try {
      await client.put('/auth/change-password', values)
      message.success(t('security.passwordChanged'))
      passwordForm.resetFields()
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('security.passwordError'))
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationUpdate = async (values: NotificationSettings) => {
    setLoading(true)
    try {
      await client.put('/users/me/notifications', values)
      message.success(t('notifications.updated'))
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('notifications.updateError'))
    } finally {
      setLoading(false)
    }
  }

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
    message.success(t('language.changed'))
  }

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined />
          {t('tabs.profile')}
        </span>
      ),
      children: (
        <Card>
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleProfileUpdate}
            style={{ maxWidth: 500 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="first_name"
                  label={t('profile.firstName')}
                  rules={[{ required: true, message: t('profile.firstNameRequired') }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="last_name"
                  label={t('profile.lastName')}
                  rules={[{ required: true, message: t('profile.lastNameRequired') }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="email" label={t('profile.email')}>
              <Input disabled />
            </Form.Item>

            <Form.Item name="phone" label={t('profile.phone')}>
              <Input placeholder="+380..." />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                {t('profile.save')}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'password',
      label: (
        <span>
          <LockOutlined />
          {t('tabs.security')}
        </span>
      ),
      children: (
        <Card title={t('security.title')}>
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordChange}
            style={{ maxWidth: 400 }}
          >
            <Form.Item
              name="current_password"
              label={t('security.currentPassword')}
              rules={[{ required: true, message: t('security.currentPasswordRequired') }]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="new_password"
              label={t('security.newPassword')}
              rules={[
                { required: true, message: t('security.newPasswordRequired') },
                { min: 6, message: t('security.passwordMinLength') },
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label={t('security.confirmPassword')}
              dependencies={['new_password']}
              rules={[
                { required: true, message: t('security.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error(t('security.passwordsDoNotMatch')))
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                {t('security.changePassword')}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          {t('tabs.notifications')}
        </span>
      ),
      children: (
        <Card>
          <Form
            form={notificationForm}
            layout="vertical"
            onFinish={handleNotificationUpdate}
            style={{ maxWidth: 500 }}
          >
            <Title level={5}>{t('notifications.channels')}</Title>

            <Form.Item name="email_enabled" label={t('notifications.email')} valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item name="telegram_enabled" label={t('notifications.telegram')} valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item
              name="telegram_chat_id"
              label={t('notifications.telegramChatId')}
              tooltip={t('notifications.telegramTooltip')}
            >
              <Input placeholder="123456789" />
            </Form.Item>

            <Divider />

            <Title level={5}>{t('notifications.events')}</Title>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="notify_ticket_created"
                  label={t('users:notifications.events.ticketCreated')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="notify_ticket_assigned"
                  label={t('users:notifications.events.ticketAssigned')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="notify_ticket_status_changed"
                  label={t('users:notifications.events.ticketStatusChanged')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="notify_ticket_commented"
                  label={t('users:notifications.events.ticketCommented')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="notify_ticket_sla_warning"
                  label={t('users:notifications.events.ticketSlaWarning')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="notify_ticket_escalated"
                  label={t('users:notifications.events.ticketEscalated')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                {t('notifications.save')}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'language',
      label: (
        <span>
          <GlobalOutlined />
          {t('tabs.language')}
        </span>
      ),
      children: (
        <Card title={t('language.title')}>
          <Space direction="vertical" size="large">
            <div>
              <Text>{t('language.current')}: </Text>
              <Text strong>{i18n.language === 'ua' ? t('language.ukrainian') : t('language.english')}</Text>
            </div>
            <Select
              value={i18n.language}
              onChange={handleLanguageChange}
              style={{ width: 200 }}
              options={[
                { value: 'ua', label: `🇺🇦 ${t('language.ukrainian')}` },
                { value: 'en', label: `🇬🇧 ${t('language.english')}` },
              ]}
            />
          </Space>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <Title level={2}>{t('title')}</Title>
      <Tabs items={tabItems} tabPosition="left" style={{ minHeight: 400 }} />
    </div>
  )
}
