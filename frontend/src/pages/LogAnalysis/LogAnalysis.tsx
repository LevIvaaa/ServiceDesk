import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  Input,
  Button,
  Typography,
  Space,
  Tag,
  List,
  Spin,
  Alert,
  Divider,
  Row,
  Col,
} from 'antd'
import {
  RobotOutlined,
  CodeOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import { logAnalysisApi, LogAnalysisResponse } from '../../api/logAnalysis'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

export default function LogAnalysis() {
  const [logContent, setLogContent] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<LogAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { t, i18n } = useTranslation()

  const handleAnalyze = async () => {
    if (!logContent.trim()) {
      setError(t('logAnalysis.emptyLog', 'Введіть лог для аналізу'))
      return
    }

    try {
      setAnalyzing(true)
      setError(null)
      const response = await logAnalysisApi.analyze({
        log_content: logContent,
        language: i18n.language,
      })
      setResult(response)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('logAnalysis.error', 'Помилка аналізу логу'))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleClear = () => {
    setLogContent('')
    setResult(null)
    setError(null)
  }

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      Available: 'green',
      Preparing: 'blue',
      Charging: 'cyan',
      SuspendedEV: 'orange',
      SuspendedEVSE: 'orange',
      Finishing: 'purple',
      Reserved: 'gold',
      Unavailable: 'default',
      Faulted: 'red',
      unknown: 'default',
      error: 'red',
    }
    return statusColors[status] || 'default'
  }

  return (
    <div>
      <Title level={2}>
        <Space>
          <CodeOutlined />
          {t('logAnalysis.title', 'Розшифровка логів')}
        </Space>
      </Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CodeOutlined />
                {t('logAnalysis.inputTitle', 'Вхідні дані')}
              </Space>
            }
          >
            <TextArea
              rows={20}
              value={logContent}
              onChange={(e) => setLogContent(e.target.value)}
              placeholder={t('logAnalysis.placeholder', 'Вставте сюди OCPP лог станції для аналізу...\n\nПриклад:\n2025-12-28T10:00:00 OcppIn StatusNotification {"connectorId": 1, "status": "Faulted", "errorCode": "GroundFailure"}')}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleAnalyze}
                loading={analyzing}
                disabled={!logContent.trim()}
                size="large"
              >
                {t('logAnalysis.analyze', 'Аналізувати з AI')}
              </Button>
              <Button onClick={handleClear}>
                {t('common:actions.clear', 'Очистити')}
              </Button>
            </Space>

            {error && (
              <Alert
                type="error"
                message={error}
                style={{ marginTop: 16 }}
                closable
                onClose={() => setError(null)}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <RobotOutlined />
                {t('logAnalysis.resultTitle', 'Результат аналізу')}
              </Space>
            }
          >
            {analyzing ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">{t('logAnalysis.analyzing', 'AI аналізує лог...')}</Text>
                </div>
              </div>
            ) : result ? (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* Status */}
                <div>
                  <Text strong>{t('logAnalysis.status', 'Статус станції')}:</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={getStatusColor(result.status)} style={{ fontSize: 14, padding: '4px 12px' }}>
                      {result.status}
                    </Tag>
                  </div>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* Analysis */}
                <div>
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text strong>{t('logAnalysis.analysisSection', 'Аналіз')}</Text>
                  </Space>
                  <Paragraph style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                    {result.analysis}
                  </Paragraph>
                </div>

                {/* Error Codes */}
                {result.error_codes.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div>
                      <Space>
                        <WarningOutlined style={{ color: '#faad14' }} />
                        <Text strong>{t('logAnalysis.errorCodes', 'Коди помилок')}</Text>
                      </Space>
                      <div style={{ marginTop: 8 }}>
                        {result.error_codes.map((code, index) => (
                          <Tag key={index} color="error" style={{ marginBottom: 4 }}>
                            {code}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div>
                      <Space>
                        <BulbOutlined style={{ color: '#1890ff' }} />
                        <Text strong>{t('logAnalysis.recommendations', 'Рекомендації')}</Text>
                      </Space>
                      <List
                        size="small"
                        dataSource={result.recommendations}
                        renderItem={(item) => (
                          <List.Item style={{ padding: '8px 0' }}>
                            <Text>• {item}</Text>
                          </List.Item>
                        )}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                  </>
                )}
              </Space>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <RobotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">
                    {t('logAnalysis.noResult', 'Вставте лог та натисніть "Аналізувати з AI" для отримання розшифровки')}
                  </Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
