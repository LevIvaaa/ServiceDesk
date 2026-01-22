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
          Профіль
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
                  label="Ім'я"
                  rules={[{ required: true, message: "Ім'я обов'язкове" }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="last_name"
                  label="Прізвище"
                  rules={[{ required: true, message: "Прізвище обов'язкове" }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="email" label="Email">
              <Input disabled />
            </Form.Item>

            <Form.Item name="phone" label="Телефон">
              <Input placeholder="+380..." />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                Зберегти
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
          Безпека
        </span>
      ),
      children: (
        <Card title="Зміна пароля">
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handlePasswordChange}
            style={{ maxWidth: 400 }}
          >
            <Form.Item
              name="current_password"
              label="Поточний пароль"
              rules={[{ required: true, message: "Введіть поточний пароль" }]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="new_password"
              label="Новий пароль"
              rules={[
                { required: true, message: "Введіть новий пароль" },
                { min: 6, message: 'Мінімум 6 символів' },
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="Підтвердіть пароль"
              dependencies={['new_password']}
              rules={[
                { required: true, message: "Підтвердіть пароль" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('Паролі не співпадають'))
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                Змінити пароль
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
          Сповіщення
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
            <Title level={5}>Канали сповіщень</Title>

            <Form.Item name="email_enabled" label="Email сповіщення" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item name="telegram_enabled" label="Telegram сповіщення" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item
              name="telegram_chat_id"
              label="Telegram Chat ID"
              tooltip="Отримайте Chat ID через @userinfobot"
            >
              <Input placeholder="123456789" />
            </Form.Item>

            <Divider />

            <Title level={5}>Події для сповіщень</Title>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="notify_ticket_created"
                  label={t('notifications.events.ticketCreated')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="notify_ticket_assigned"
                  label={t('notifications.events.ticketAssigned')}
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
                  label={t('notifications.events.ticketStatusChanged')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="notify_ticket_commented"
                  label={t('notifications.events.ticketCommented')}
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
                  label={t('notifications.events.ticketSlaWarning')}
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="notify_ticket_escalated"
                  label="Ескалація тікету"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                Зберегти налаштування
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
          Мова
        </span>
      ),
      children: (
        <Card title="Мова інтерфейсу">
          <Space direction="vertical" size="large">
            <div>
              <Text>Поточна мова: </Text>
              <Text strong>{i18n.language === 'uk' ? 'Українська' : 'English'}</Text>
            </div>
            <Select
              value={i18n.language}
              onChange={handleLanguageChange}
              style={{ width: 200 }}
              options={[
                { value: 'uk', label: '🇺🇦 Українська' },
                { value: 'en', label: '🇬🇧 English' },
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
