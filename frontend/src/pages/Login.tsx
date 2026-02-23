import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Form, Input, Button, Card, Typography, Alert, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

const { Title } = Typography

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login } = useAuthStore()

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      setLoading(true)
      setError(null)
      await login(values)
      message.success('Login successful')
      navigate('/')
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Забагато спроб входу. Зачекайте хвилину.')
      } else {
        setError(err.response?.data?.detail || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={2} className="login-title">
          {t('app.title')}
        </Title>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: t('validation.required') },
              { type: 'email', message: t('validation.email') },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('validation.required') }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
