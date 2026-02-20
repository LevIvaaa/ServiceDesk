import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
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
  Row,
  Col,
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
import { stationsApi, StationListItem, Station, StationPort } from '../../api/stations'
import { departmentsApi, Department } from '../../api/departments'
import { incidentTypesApi, IncidentType } from '../../api/incidentTypes'

const { Text } = Typography
const { TextArea } = Input

// Типи інцидентів завантажуються з API

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
  station: StationListItem
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
  const [stationPorts, setStationPorts] = useState<StationPort[]>([])
  const [attachmentFiles, setAttachmentFiles] = useState<UploadFile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([])
  const [incidentTypesLoading, setIncidentTypesLoading] = useState(false)
  const [stationLogs, setStationLogs] = useState('')
  const [analyzingLog, setAnalyzingLog] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [descriptionImages, setDescriptionImages] = useState<File[]>([])
  const [descriptionText, setDescriptionText] = useState('')
  
  const navigate = useNavigate()
  const { i18n } = useTranslation('tickets')

  // Auto focus on first field when modal opens
  useEffect(() => {
    if (isModal) {
      setTimeout(() => {
        const firstInput = document.querySelector('[tabindex="1"]') as HTMLElement
        if (firstInput) {
          firstInput.focus()
        }
      }, 100)
    }
  }, [isModal])

  // Trap focus inside modal - make tab navigation cyclic
  useEffect(() => {
    if (!isModal) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = document.querySelectorAll(
        '[tabindex="1"], [tabindex="2"], [tabindex="3"], [tabindex="4"], [tabindex="5"], [tabindex="6"], [tabindex="7"], [tabindex="8"], [tabindex="9"], [tabindex="10"], [tabindex="11"], [tabindex="12"], [tabindex="13"]'
      )
      
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
      const activeElement = document.activeElement as HTMLElement

      // If shift+tab on first element, go to last
      if (e.shiftKey && activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
      // If tab on last element, go to first
      else if (!e.shiftKey && activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModal])

  // Load saved form data from localStorage on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('ticketFormDraft')
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData)
        form.setFieldsValue(parsedData)
        if (parsedData.station_logs) {
          setStationLogs(parsedData.station_logs)
        }
        if (parsedData.description) {
          setDescriptionText(parsedData.description)
        }
        if (parsedData.station_id) {
          // Reload station data if station was selected
          handleStationSelect(parsedData.station_id)
        }
      } catch (error) {
        console.error('Failed to load saved form data:', error)
      }
    }
  }, [])

  // Save form data to localStorage on every change
  const saveFormDraft = () => {
    const formValues = form.getFieldsValue()
    const draftData = {
      ...formValues,
      station_logs: stationLogs,
      description: descriptionText,
    }
    localStorage.setItem('ticketFormDraft', JSON.stringify(draftData))
  }

  // Clear draft after successful submission
  const clearFormDraft = () => {
    localStorage.removeItem('ticketFormDraft')
    setDescriptionImages([])
    setDescriptionText('')
  }

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

  // Load incident types from API
  const loadIncidentTypes = async () => {
    try {
      setIncidentTypesLoading(true)
      const data = await incidentTypesApi.list(true)
      setIncidentTypes(data)
    } catch (error) {
      console.error('Failed to load incident types:', error)
    } finally {
      setIncidentTypesLoading(false)
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
        per_page: 20,
      })

      const options = response.items.map((station) => ({
        value: station.id,
        label: station.station_number 
          ? `${station.station_number} - ${station.name}`
          : `${station.station_id} - ${station.name}`,
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
  const handleStationSelect = async (value: number) => {
    try {
      // Загружаем полную информацию о станции с портами
      const lang = i18n.language?.startsWith('en') ? 'en' : 'ua'
      const fullStation = await stationsApi.get(value, lang)
      setSelectedStation(fullStation)
      setStationPorts(fullStation.ports || [])
      
      // Очищаем выбранный порт при смене станции
      form.setFieldsValue({ 
        station_id: value,
        port_type: undefined 
      })
    } catch (error) {
      console.error('Failed to load station details:', error)
      message.error('Помилка завантаження інформації про станцію')
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

  // Handle paste event for description field (screenshots)
  const handleDescriptionPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // Check if it's an image
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        
        const file = item.getAsFile()
        if (!file) continue

        // Generate a unique filename
        const timestamp = Date.now()
        const fileName = `screenshot-${timestamp}.png`
        const renamedFile = new File([file], fileName, { type: file.type })

        // Add to description images
        setDescriptionImages(prev => [...prev, renamedFile])
        
        // Add placeholder text in description
        const textarea = e.currentTarget
        const cursorPos = textarea.selectionStart
        const textBefore = descriptionText.substring(0, cursorPos)
        const textAfter = descriptionText.substring(cursorPos)
        const newText = `${textBefore}\n[Скріншот: ${fileName}]\n${textAfter}`
        
        setDescriptionText(newText)
        form.setFieldValue('description', newText)
        
        message.success('Скріншот додано')
      }
    }
  }

  // Handle drag and drop for description field
  const handleDescriptionDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    
    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Check if it's an image
      if (file.type.indexOf('image') !== -1) {
        // Add to description images
        setDescriptionImages(prev => [...prev, file])
        
        // Add placeholder text in description
        const newText = `${descriptionText}\n[Скріншот: ${file.name}]\n`
        setDescriptionText(newText)
        form.setFieldValue('description', newText)
        
        message.success(`Зображення ${file.name} додано`)
      }
    }
  }

  const handleDescriptionDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
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
        description: descriptionText || values.description,
        category: category,
        priority: 'medium',
        incident_type: values.incident_type,
        station_id: values.station_id,
        port_type: values.port_type,
        vehicle: values.vehicle,  // Car model
        reporter_name: values.reporter_name,
        reporter_phone: values.reporter_phone,
        contact_source: values.contact_source,
        station_logs: stationLogs,
        assigned_department_id: values.assigned_department_id,
      }

      const ticket = await ticketsApi.create(ticketData)

      // Upload attachments from file picker
      if (attachmentFiles.length > 0) {
        for (const file of attachmentFiles) {
          if (file.originFileObj) {
            await ticketsApi.uploadAttachment(ticket.id, file.originFileObj)
          }
        }
      }

      // Upload images from description (pasted screenshots)
      if (descriptionImages.length > 0) {
        for (const imageFile of descriptionImages) {
          await ticketsApi.uploadAttachment(ticket.id, imageFile)
        }
      }

      // Clear draft after successful creation
      clearFormDraft()

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
    loadIncidentTypes()
  }, [i18n.language])

  return (
    <div style={{ 
      maxWidth: isModal ? '100%' : 870, 
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
          onValuesChange={saveFormDraft}
        >
          <Row gutter={20}>
            {/* LEFT COLUMN */}
            <Col span={12}>
              {/* Заголовок інциденту */}
              <Form.Item
                label={<span style={{ fontSize: 13 }}><span style={{ color: 'red' }}>* </span>Заголовок інциденту</span>}
                name="incident_type"
                rules={[{ required: true, message: 'Оберіть тип проблеми' }]}
                style={{ marginBottom: 14 }}
              >
                <Select
                  placeholder="Оберіть тип проблеми..."
                  showSearch
                  optionFilterProp="children"
                  style={{ fontSize: 13 }}
                  autoFocus
                  tabIndex={1}
                  loading={incidentTypesLoading}
                >
                  {incidentTypes.map((type) => (
                    <Select.Option key={type.id} value={type.name}>
                      {type.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Номер інциденту */}
              <Form.Item 
                label={<span style={{ fontSize: 13 }}>Номер інциденту</span>}
                style={{ marginBottom: 14 }}
              >
                <Input 
                  value="Автогенерація" 
                  disabled 
                  style={{ color: '#1890ff', fontStyle: 'italic', fontSize: 13 }}
                  tabIndex={-1}
                />
              </Form.Item>

              {/* Відділ */}
              <Form.Item
                label={<span style={{ fontSize: 13 }}><span style={{ color: 'red' }}>* </span>Відділ</span>}
                name="assigned_department_id"
                rules={[{ required: true, message: 'Оберіть відділ' }]}
                style={{ marginBottom: 14 }}
              >
                <Select
                  placeholder="Оберіть відділ..."
                  loading={departmentsLoading}
                  showSearch
                  optionFilterProp="children"
                  style={{ fontSize: 13 }}
                  tabIndex={2}
                >
                  {departments.map((dept) => (
                    <Select.Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Станція */}
              <Form.Item
                label={<span style={{ fontSize: 13 }}><span style={{ color: 'red' }}>* </span>Станція</span>}
                name="station_id"
                rules={[{ required: true, message: 'Оберіть станцію' }]}
                style={{ marginBottom: 14 }}
              >
                <Select
                  showSearch
                  placeholder="Пошук по номеру (1892, 2099...)"
                  loading={stationSearchLoading}
                  onSearch={searchStations}
                  onChange={handleStationSelect}
                  filterOption={false}
                  notFoundContent={stationSearchLoading ? <Spin size="small" /> : null}
                  style={{ fontSize: 13 }}
                  tabIndex={3}
                >
                  {stationOptions.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Тип порту */}
              <Form.Item
                label={<span style={{ fontSize: 13 }}>Тип порту</span>}
                name="port_type"
                style={{ marginBottom: 14 }}
              >
                <Select
                  placeholder={selectedStation ? "Оберіть тип порту..." : "Спочатку оберіть станцію"}
                  showSearch
                  optionFilterProp="children"
                  disabled={!selectedStation || stationPorts.length === 0}
                  notFoundContent={selectedStation && stationPorts.length === 0 ? "У станції немає портів" : null}
                  style={{ fontSize: 13 }}
                  tabIndex={4}
                >
                  {stationPorts.map((port) => (
                    <Select.Option 
                      key={port.id} 
                      value={port.connector_type || `Порт ${port.port_number}`}
                    >
                      {port.connector_type 
                        ? `${port.connector_type}${port.power_kw ? ` (${port.power_kw} kW)` : ''} - Порт ${port.port_number}`
                        : `Порт ${port.port_number}`
                      }
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Модель авто */}
              <Form.Item
                label={<span style={{ fontSize: 13 }}>Модель авто</span>}
                name="vehicle"
                style={{ marginBottom: 14 }}
              >
                <Input 
                  placeholder="Введіть модель авто..." 
                  style={{ fontSize: 13 }}
                  tabIndex={5}
                />
              </Form.Item>

              {/* Контактна інформація */}
              <div style={{ marginTop: 20, marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
                  Контактна інформація
                </Text>

                <Form.Item
                  label={<span style={{ fontSize: 13 }}>Ім'я клієнта</span>}
                  name="reporter_name"
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="---" style={{ fontSize: 13 }} tabIndex={6} />
                </Form.Item>

                <Form.Item
                  label={<span style={{ fontSize: 13 }}>Телефон клієнта</span>}
                  name="reporter_phone"
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="---" style={{ fontSize: 13 }} tabIndex={7} />
                </Form.Item>

                <Form.Item
                  label={<span style={{ fontSize: 13 }}>Джерело</span>}
                  name="contact_source"
                  style={{ marginBottom: 0 }}
                >
                  <Select placeholder="---" style={{ fontSize: 13 }} tabIndex={8}>
                    {CONTACT_SOURCES.map((source) => (
                      <Select.Option key={source.value} value={source.value}>
                        {source.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </div>
            </Col>

            {/* RIGHT COLUMN */}
            <Col span={12}>
              {/* Station details */}
              {selectedStation && (
                <Alert
                  message={
                    <div>
                      <Space style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 14 }}>🔌</span>
                        <Text strong style={{ fontSize: 13 }}>
                          Станція № {selectedStation.station_number || selectedStation.station_id}
                        </Text>
                      </Space>
                      <div style={{ paddingLeft: 20, fontSize: 12 }}>
                        <div style={{ marginBottom: 3 }}>
                          <Text strong style={{ fontSize: 12 }}>ID станції:</Text> <Text style={{ fontSize: 12 }}>{selectedStation.station_id}</Text>
                        </div>
                        <div style={{ marginBottom: 3 }}>
                          <EnvironmentOutlined style={{ color: '#1890ff', marginRight: 6, fontSize: 12 }} />
                          <Text strong style={{ fontSize: 12 }}>Адреса:</Text> <Text style={{ fontSize: 12 }}>{selectedStation.address || 'Не вказано'}</Text>
                        </div>
                        <div style={{ marginBottom: 3 }}>
                          <UserOutlined style={{ color: '#1890ff', marginRight: 6, fontSize: 12 }} />
                          <Text strong style={{ fontSize: 12 }}>Власник:</Text> <Text style={{ fontSize: 12 }}>{selectedStation.operator?.name || 'Не вказано'}</Text>
                        </div>
                        <div>
                          <ToolOutlined style={{ color: '#1890ff', marginRight: 6, fontSize: 12 }} />
                          <Text strong style={{ fontSize: 12 }}>Виробник:</Text> <Text style={{ fontSize: 12 }}>ECOFACTOR</Text>
                        </div>
                      </div>
                    </div>
                  }
                  type="warning"
                  style={{ 
                    marginBottom: 14,
                    backgroundColor: '#fff7e6',
                    border: '1px solid #ffd591',
                    padding: '6px 10px'
                  }}
                />
              )}

              {/* Опис проблеми */}
              <div style={{ marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
                  Опис проблеми
                </Text>

                <Alert
                  message="💡 Підказка: Ви можете вставити скріншоти прямо в опис за допомогою Ctrl+V або перетягнути зображення"
                  type="info"
                  showIcon
                  closable
                  style={{ marginBottom: 12, fontSize: 12 }}
                />

                <Form.Item
                  label={<span style={{ fontSize: 13 }}>Опис</span>}
                  name="description"
                  rules={[{ required: true, message: 'Введіть опис проблеми' }]}
                  style={{ marginBottom: 12 }}
                >
                  <TextArea
                    rows={3}
                    placeholder="Детальний опис інциденту... (Ctrl+V для вставки скріншотів)"
                    style={{ fontSize: 13 }}
                    tabIndex={9}
                    value={descriptionText}
                    onChange={(e) => {
                      setDescriptionText(e.target.value)
                      saveFormDraft()
                    }}
                    onPaste={handleDescriptionPaste}
                    onDrop={handleDescriptionDrop}
                    onDragOver={handleDescriptionDragOver}
                  />
                </Form.Item>

                {/* Show pasted images preview */}
                {descriptionImages.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      Вставлені зображення ({descriptionImages.length}):
                    </Text>
                    <Space wrap size={8}>
                      {descriptionImages.map((img, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            display: 'inline-block',
                            padding: 4,
                            border: '1px solid #d9d9d9',
                            borderRadius: 4,
                            backgroundColor: '#fafafa',
                          }}
                        >
                          <Text style={{ fontSize: 11 }}>📷 {img.name}</Text>
                          <Button
                            type="text"
                            size="small"
                            danger
                            style={{ marginLeft: 4, padding: '0 4px', height: 20 }}
                            onClick={() => {
                              setDescriptionImages(prev => prev.filter((_, i) => i !== idx))
                              // Remove placeholder from description
                              const newText = descriptionText.replace(`[Скріншот: ${img.name}]`, '')
                              setDescriptionText(newText)
                              form.setFieldValue('description', newText)
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </Space>
                  </div>
                )}

                {/* Вкладення */}
                <Form.Item label={<span style={{ fontSize: 13 }}>Додаткові файли</span>} style={{ marginBottom: 0 }}>
                  <Upload
                    fileList={attachmentFiles}
                    onChange={({ fileList }) => setAttachmentFiles(fileList)}
                    beforeUpload={() => false}
                    multiple
                  >
                    <Button icon={<UploadOutlined />} size="small" tabIndex={10}>
                      Додати файли
                    </Button>
                  </Upload>
                </Form.Item>
              </div>

              {/* Логи станції */}
              <div style={{ marginBottom: 14 }}>
                <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
                  Логи станції
                </Text>

                <Form.Item label={<span style={{ fontSize: 13 }}>Текст логу</span>} style={{ marginBottom: 0 }}>
                  <TextArea
                    rows={3}
                    placeholder="Вставте OCPP логи або текст..."
                    value={stationLogs}
                    onChange={(e) => {
                      setStationLogs(e.target.value)
                      saveFormDraft()
                    }}
                    style={{ fontSize: 13 }}
                    tabIndex={11}
                  />
                  <div style={{ marginTop: 6 }}>
                    <Button
                      icon={<RobotOutlined />}
                      onClick={handleAnalyzeLog}
                      loading={analyzingLog}
                      disabled={!stationLogs.trim()}
                      size="small"
                      style={{ backgroundColor: '#f0f5ff', borderColor: '#adc6ff', color: '#2f54eb' }}
                      tabIndex={12}
                    >
                      Розпізнати AI
                    </Button>
                  </div>
                </Form.Item>

                {/* AI Analysis Result */}
                {aiAnalysis && (
                  <Form.Item label={<span style={{ fontSize: 13 }}>AI Розшифровка</span>} style={{ marginTop: 12 }}>
                    <TextArea
                      rows={8}
                      value={aiAnalysis}
                      readOnly
                      style={{ 
                        backgroundColor: '#f6ffed', 
                        border: '1px solid #b7eb8f',
                        color: '#000',
                        fontSize: 12
                      }}
                      tabIndex={-1}
                    />
                  </Form.Item>
                )}
              </div>

              {/* Buttons */}
              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  {!isModal && (
                    <Button onClick={() => navigate('/tickets')} size="middle" tabIndex={14}>
                      Скасувати
                    </Button>
                  )}
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    size="middle"
                    tabIndex={13}
                  >
                    Зберегти
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
        </div>
      </div>
    </div>
  )
}
