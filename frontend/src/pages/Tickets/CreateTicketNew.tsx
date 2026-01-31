import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Typography,
  message,
  Upload,
  Space,
  Alert,
  Spin,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  ArrowLeftOutlined,
  UploadOutlined,
  RobotOutlined,
  EnvironmentOutlined,
  UserOutlined,
  ToolOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { ticketsApi } from '../../api/tickets'
import { stationsApi, Station } from '../../api/stations'
import { departmentsApi, Department } from '../../api/departments'

const { Title, Text } = Typography
const { TextArea } = Input

// Типи інцидентів
const INCIDENT_TYPES = [
  'Софтовий баг',
  'Фізична поломка',
  'Не може зарядитись',
  'Перерахунок',
  'Поганий зв\'язок',
  'ДВС',
  'Зламалось авто',
  'Інше',
]

// Типи портів
const PORT_TYPES = [
  'CCS 2',
  'CHADEMO',
  'GBT DC',
  'GBT AC',
  'Type 2 socket',
  'Type 2 plug',
  'Type 1',
  'NACS DC',
  'NACS AC',
]

// Джерела звернення
const CONTACT_SOURCES = [
  { value: 'phone', label: 'Телефон' },
  { value: 'email', label: 'Email' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'viber', label: 'Viber' },
  { value: 'app', label: 'Мобільний додаток' },
  { value: 'other', label: 'Інше' },
]

interface StationOption {
  value: number
  label: string
  station: Station
}

interface CreateTicketNewProps {
  onSuccess?: () => void
  isModal?: boolean
}

export default function CreateTicketNew({ onSuccess, isModal = false }: CreateTicketNewProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [stationSearchLoading, setStationSearchLoading] = useState(false)
  const [stationOptions, setStationOptions] = useState<StationOption[]>([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [attachmentFiles, setAttachmentFiles] = useState<UploadFile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [stationLogs, setStationLogs] = useState('')
  const [analyzingLog, setAnalyzingLog] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')
  
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('tickets')

  // Load departments
  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true)
      const response = await departmentsApi.list({ 
        is_active: true, 
        per_page: 100,
        lang: i18n.language 
      })
      setDepartments(response.items)
    } catch (error) {
      console.error('Failed to load departments:', error)
    } finally {
      setDepartmentsLoading(false)
    }
  }

  // Search stations
  const searchStations = async (searchValue: string) => {
    if (!searchValue || searchValue.length < 2) {
      setStationOptions([])
      return
    }

    try {
      setStationSearchLoading(true)
      const response = await stationsApi.list({
        search: searchValue,
        is_active: true,
        per_page: 20,
      })

      const options: StationOption[] = response.items.map((station) => ({
        value: station.id,
        label: `${station.station_id} - ${station.name}`,
        station,
      }))

      setStationOptions(options)
    } catch (error) {
      console.error('Failed to search stations:', error)
    } finally {
      setStationSearchLoading(false)
    }
  }

  // Handle station selection
  const handleStationSelect = (value: number) => {
    const option = stationOptions.find((opt) => opt.value === value)
    if (option) {
      setSelectedStation(option.station)
      // Set the form field value explicitly
      form.setFieldsValue({ station_id: value })
    }
  }

  // Handle AI log analysis
  const handleAnalyzeLog = async () => {
    if (!stationLogs.trim()) {
      message.warning('Введіть логи для розпізнавання')
      return
    }

    try {
      setAnalyzingLog(true)
      
      // Simulate AI analysis (replace with actual API call later)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock AI analysis result
      const analysisResult = `🤖 AI Розшифровка логу:

📊 Виявлені проблеми:
• Помилка GroundFailure - виявлено замикання на землю
• Зарядка аварійно зупинена (EmergencyStop)
• Втрачено зв'язок з станцією (Heartbeat timeout)

⚡ Технічні деталі:
• Порт: CCS 2
• Транзакція #78945 перервана
• Передано енергії: 2.34 kWh
• Час роботи: ~2 хвилини

🔧 Рекомендації:
1. Перевірити заземлення станції
2. Перевірити кабель CCS 2 на пошкодження
3. Перезавантажити станцію
4. Якщо проблема повторюється - викликати технічного спеціаліста

⚠️ Пріоритет: Високий
Станція потребує негайної перевірки через помилку заземлення.`
      
      setAiAnalysis(analysisResult)
      
    } catch (error) {
      message.error('Помилка розпізнавання логів')
    } finally {
      setAnalyzingLog(false)
    }
  }

  // Handle form submit
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)

      // Визначаємо категорію на основі типу інциденту
      let category = 'other'
      const incidentType = values.incident_type?.toLowerCase() || ''
      
      if (incidentType.includes('софтов') || incidentType.includes('баг') || incidentType.includes('звязок')) {
        category = 'software'
      } else if (incidentType.includes('фізичн') || incidentType.includes('поломк') || incidentType.includes('зламал')) {
        category = 'hardware'
      } else if (incidentType.includes('зарядит') || incidentType.includes('двс')) {
        category = 'hardware'
      } else if (incidentType.includes('перерахунок')) {
        category = 'billing'
      } else if (incidentType.includes('звязок') || incidentType.includes('зв\'язок')) {
        category = 'network'
      }

      const ticketData: any = {
        title: values.incident_type || 'Новий інцидент',
        description: values.description,
        category: category,
        priority: 'medium',
        incident_type: values.incident_type,
        station_id: values.station_id,
        port_type: values.port_type,
        reporter_name: values.reporter_name,
        reporter_phone: values.reporter_phone,
        contact_source: values.contact_source,
        station_logs: stationLogs,
        assigned_department_id: values.assigned_department_id,
      }

      const ticket = await ticketsApi.create(ticketData)

      // Upload attachments if any
      if (attachmentFiles.length > 0) {
        for (const file of attachmentFiles) {
          if (file.originFileObj) {
            await ticketsApi.uploadAttachment(ticket.id, file.originFileObj)
          }
        }
      }

      message.success('Тікет успішно створено')
      if (onSuccess) {
        onSuccess()
      } else {
        navigate(`/tickets/${ticket.id}`)
      }
    } catch (error: any) {
      console.error('Failed to create ticket:', error)
      message.error(error.response?.data?.detail || 'Помилка створення тікета')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments()
  }, [i18n.language])

  return (
    <div style={{ 
      maxWidth: isModal ? '100%' : 700, 
      margin: isModal ? 0 : '0 auto', 
      padding: isModal ? 0 : '0 16px',
      width: '100%'
    }}>
      {!isModal && (
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tickets')}
          style={{ marginBottom: 16 }}
          type="text"
        >
          Назад
        </Button>
      )}

      {/* Blue Header */}
      {isModal && (
        <div style={{
          background: 'linear-gradient(90deg, #096dd9 0%, #1890ff 100%)',
          padding: '16px 24px',
          color: '#fff',
          borderRadius: 0,
        }}>
          <Space>
            <FileTextOutlined style={{ fontSize: 20 }} />
            <span style={{ fontSize: 20, fontWeight: 500 }}>Реєстрація інциденту</span>
          </Space>
        </div>
      )}

      <div style={{ 
        background: '#fff',
        borderRadius: isModal ? 0 : 8,
        overflow: 'hidden',
        boxShadow: isModal ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
        width: '100%'
      }}>
        {/* Blue Header for non-modal */}
        {!isModal && (
          <div style={{
            background: 'linear-gradient(90deg, #096dd9 0%, #1890ff 100%)',
            padding: '16px 24px',
            color: '#fff',
            borderRadius: 0,
          }}>
            <Space>
              <FileTextOutlined style={{ fontSize: 20 }} />
              <span style={{ fontSize: 20, fontWeight: 500 }}>Реєстрація інциденту</span>
            </Space>
          </div>
        )}

        {/* Form Content */}
        <div style={{ padding: '20px' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          {/* Заголовок інциденту */}
          <Form.Item
            label={<span><span style={{ color: 'red' }}>* </span>Заголовок інциденту</span>}
            name="incident_type"
            rules={[{ required: true, message: 'Оберіть тип проблеми' }]}
            style={{ marginBottom: 20 }}
          >
            <Select
              placeholder="Оберіть тип проблеми..."
              showSearch
              optionFilterProp="children"
            >
              {INCIDENT_TYPES.map((type) => (
                <Select.Option key={type} value={type}>
                  {type}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Номер інциденту */}
          <Form.Item 
            label="Номер інциденту" 
            style={{ marginBottom: 8 }}
          >
            <Input 
              value="Автогенерація" 
              disabled 
              style={{ color: '#1890ff', fontStyle: 'italic' }}
            />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -4, marginBottom: 20 }}>
            Генерується автоматично при збереженні
          </Text>

          {/* Відділ */}
          <Form.Item
            label={<span><span style={{ color: 'red' }}>* </span>Відділ</span>}
            name="assigned_department_id"
            rules={[{ required: true, message: 'Оберіть відділ' }]}
            style={{ marginBottom: 8 }}
          >
            <Select
              placeholder="Оберіть відділ..."
              loading={departmentsLoading}
              showSearch
              optionFilterProp="children"
            >
              {departments.map((dept) => (
                <Select.Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -4, marginBottom: 20 }}>
            Відділ, який буде обробляти тікет
          </Text>

          {/* Станція */}
          <Form.Item
            label={<span><span style={{ color: 'red' }}>* </span>Станція</span>}
            name="station_id"
            rules={[{ required: true, message: 'Оберіть станцію' }]}
            style={{ marginBottom: 8 }}
          >
            <Select
              showSearch
              placeholder="Пошук по номеру (1892, 2099...)"
              loading={stationSearchLoading}
              onSearch={searchStations}
              onChange={handleStationSelect}
              filterOption={false}
              notFoundContent={stationSearchLoading ? <Spin size="small" /> : null}
            >
              {stationOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Station details */}
          {selectedStation && (
            <Alert
              message={
                <div>
                  <Space style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>🔌</span>
                    <Text strong>{selectedStation.station_id}</Text>
                  </Space>
                  <div style={{ paddingLeft: 24 }}>
                    <div style={{ marginBottom: 4 }}>
                      <EnvironmentOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                      <Text strong>Адреса станції:</Text> <Text>{selectedStation.address || 'Не вказано'}</Text>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <UserOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                      <Text strong>Власник станції:</Text> <Text>{selectedStation.operator?.name || 'Не вказано'}</Text>
                    </div>
                    <div>
                      <ToolOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                      <Text strong>Виробник станції:</Text> <Text>EcoFactor</Text>
                    </div>
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                    Завантажується автоматично по номеру станції
                  </Text>
                </div>
              }
              type="warning"
              style={{ 
                marginBottom: 20,
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591'
              }}
            />
          )}

          {/* Порт станції */}
          <Form.Item
            label={<span><span style={{ color: 'red' }}>* </span>Порт станції</span>}
            name="port_type"
            rules={[{ required: true, message: 'Оберіть порт станції' }]}
            style={{ marginBottom: 20 }}
          >
            <Select
              placeholder="Оберіть порт..."
              showSearch
              optionFilterProp="children"
            >
              {PORT_TYPES.map((type) => (
                <Select.Option key={type} value={type}>
                  {type}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Контактна інформація */}
          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 16 }}>
              Контактна інформація
            </Text>

            <Form.Item
              label="Ім'я клієнта"
              name="reporter_name"
              style={{ marginBottom: 16 }}
            >
              <Input placeholder="---" />
            </Form.Item>

            <Form.Item
              label="Телефон клієнта"
              name="reporter_phone"
              style={{ marginBottom: 16 }}
            >
              <Input placeholder="---" />
            </Form.Item>

            <Form.Item
              label="Джерело"
              name="contact_source"
              style={{ marginBottom: 0 }}
            >
              <Select placeholder="---">
                {CONTACT_SOURCES.map((source) => (
                  <Select.Option key={source.value} value={source.value}>
                    {source.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* Опис проблеми */}
          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 16 }}>
              Опис проблеми
            </Text>

            <Form.Item
              label="Опис"
              name="description"
              rules={[{ required: true, message: 'Введіть опис проблеми' }]}
              style={{ marginBottom: 16 }}
            >
              <TextArea
                rows={4}
                placeholder="Детальний опис інциденту..."
              />
            </Form.Item>

            {/* Вкладення */}
            <Form.Item label="Вкладення" style={{ marginBottom: 0 }}>
              <Upload
                fileList={attachmentFiles}
                onChange={({ fileList }) => setAttachmentFiles(fileList)}
                beforeUpload={() => false}
                multiple
              >
                <Button icon={<UploadOutlined />}>
                  Додати файли
                </Button>
              </Upload>
            </Form.Item>
          </div>

          {/* Логи станції */}
          <div style={{ marginBottom: 24 }}>
            <Text strong style={{ display: 'block', marginBottom: 16 }}>
              Логи станції
            </Text>

            <Form.Item label="Текст логу" style={{ marginBottom: 0 }}>
              <TextArea
                rows={4}
                placeholder="Вставте OCPP логи, повідомлення клієнта, діагностику станції або будь-який текст..."
                value={stationLogs}
                onChange={(e) => setStationLogs(e.target.value)}
              />
              <div style={{ marginTop: 8 }}>
                <Button
                  icon={<RobotOutlined />}
                  onClick={handleAnalyzeLog}
                  loading={analyzingLog}
                  disabled={!stationLogs.trim()}
                  style={{ backgroundColor: '#f0f5ff', borderColor: '#adc6ff', color: '#2f54eb' }}
                >
                  Розпізнати AI
                </Button>
              </div>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 6 }}>
                Можна вставити повідомлення клієнта або завантажити картинку у вкладенні для розпізнавання
              </Text>
            </Form.Item>

            {/* AI Analysis Result */}
            {aiAnalysis && (
              <Form.Item label="AI Розшифровка" style={{ marginTop: 16 }}>
                <TextArea
                  rows={12}
                  value={aiAnalysis}
                  readOnly
                  style={{ 
                    backgroundColor: '#f6ffed', 
                    border: '1px solid #b7eb8f',
                    color: '#000'
                  }}
                />
              </Form.Item>
            )}
          </div>

          {/* Buttons */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
              >
                Зберегти
              </Button>
              {!isModal && (
                <Button onClick={() => navigate('/tickets')}>
                  Скасувати
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
        </div>
      </div>
    </div>
  )
}
