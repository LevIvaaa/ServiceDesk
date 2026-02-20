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
  Spin,
  Row,
  Col,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  ArrowLeftOutlined,
  UploadOutlined,
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
  const [logFiles, setLogFiles] = useState<UploadFile[]>([])
  const [stationLogs, setStationLogs] = useState('')
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
        station_logs: stationLogs || undefined,
        assigned_department_id: values.assigned_department_id,
        client_type: values.client_type,
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

      // Upload log files as attachments
      if (logFiles.length > 0) {
        for (const file of logFiles) {
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
        <div style={{ padding: isModal ? '12px 16px' : '20px' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
          onValuesChange={saveFormDraft}
          size={isModal ? 'small' : 'middle'}
        >
          <Row gutter={16}>
            {/* LEFT COLUMN */}
            <Col span={12}>
              <Form.Item
                label={<span style={{ fontSize: 12 }}><span style={{ color: 'red' }}>* </span>Заголовок інциденту</span>}
                name="incident_type"
                rules={[{ required: true, message: 'Оберіть тип проблеми' }]}
                style={{ marginBottom: 8 }}
              >
                <Select
                  placeholder="Оберіть тип проблеми..."
                  showSearch
                  optionFilterProp="children"
                  style={{ fontSize: 12 }}
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

              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ fontSize: 12 }}><span style={{ color: 'red' }}>* </span>Відділ</span>}
                    name="assigned_department_id"
                    rules={[{ required: true, message: 'Оберіть відділ' }]}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      placeholder="Оберіть відділ..."
                      loading={departmentsLoading}
                      showSearch
                      optionFilterProp="children"
                      style={{ fontSize: 12 }}
                      tabIndex={2}
                    >
                      {departments.map((dept) => (
                        <Select.Option key={dept.id} value={dept.id}>
                          {dept.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ fontSize: 12 }}>Тип клієнта</span>}
                    name="client_type"
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      placeholder="B2C / B2B"
                      allowClear
                      style={{ fontSize: 12 }}
                    >
                      <Select.Option value="B2C">B2C</Select.Option>
                      <Select.Option value="B2B">B2B</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label={<span style={{ fontSize: 12 }}><span style={{ color: 'red' }}>* </span>Станція</span>}
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
                  style={{ fontSize: 12 }}
                  tabIndex={3}
                >
                  {stationOptions.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ fontSize: 12 }}>Тип порту</span>}
                    name="port_type"
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      placeholder={selectedStation ? "Тип порту..." : "Оберіть станцію"}
                      showSearch
                      optionFilterProp="children"
                      disabled={!selectedStation || stationPorts.length === 0}
                      notFoundContent={selectedStation && stationPorts.length === 0 ? "Немає портів" : null}
                      style={{ fontSize: 12 }}
                      tabIndex={4}
                    >
                      {stationPorts.map((port) => (
                        <Select.Option 
                          key={port.id} 
                          value={port.connector_type || `Порт ${port.port_number}`}
                        >
                          {port.connector_type 
                            ? `${port.connector_type}${port.power_kw ? ` (${port.power_kw} kW)` : ''}`
                            : `Порт ${port.port_number}`
                          }
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<span style={{ fontSize: 12 }}>Модель авто</span>}
                    name="vehicle"
                    style={{ marginBottom: 8 }}
                  >
                    <Input 
                      placeholder="Модель авто..." 
                      style={{ fontSize: 12 }}
                      tabIndex={5}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Контактна інформація */}
              <div style={{ marginTop: 4, marginBottom: 0 }}>
                <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                  Контактна інформація
                </Text>

                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item
                      label={<span style={{ fontSize: 12 }}>Ім'я клієнта</span>}
                      name="reporter_name"
                      style={{ marginBottom: 8 }}
                    >
                      <Input placeholder="---" style={{ fontSize: 12 }} tabIndex={6} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label={<span style={{ fontSize: 12 }}>Телефон</span>}
                      name="reporter_phone"
                      style={{ marginBottom: 8 }}
                    >
                      <Input placeholder="---" style={{ fontSize: 12 }} tabIndex={7} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label={<span style={{ fontSize: 12 }}>Джерело</span>}
                  name="contact_source"
                  style={{ marginBottom: 0 }}
                >
                  <Select placeholder="---" style={{ fontSize: 12 }} tabIndex={8}>
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
                <div
                  style={{ 
                    marginBottom: 8,
                    backgroundColor: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#389e0d' }}>
                    🔌 Станція № {selectedStation.station_number || selectedStation.station_id}
                  </div>
                  <div style={{ color: '#595959' }}>
                    {selectedStation.address && <div>📍 {selectedStation.address}{selectedStation.city ? `, ${selectedStation.city}` : ''}</div>}
                    {selectedStation.operator?.name && <div>🏢 {selectedStation.operator.name}</div>}
                    {selectedStation.model && <div>📦 {selectedStation.model}</div>}
                    {selectedStation.status && (
                      <div>⚡ Статус: <span style={{ 
                        color: selectedStation.status === 'active' ? '#52c41a' : '#faad14',
                        fontWeight: 500
                      }}>{selectedStation.status === 'active' ? 'Активна' : selectedStation.status === 'inactive' ? 'Неактивна' : selectedStation.status}</span></div>
                    )}
                    {stationPorts.length > 0 && (
                      <div>🔗 Порти: {stationPorts.map(p => p.connector_type || `#${p.port_number}`).join(', ')}</div>
                    )}
                  </div>
                </div>
              )}

              <Form.Item
                label={<span style={{ fontSize: 12 }}><span style={{ color: 'red' }}>* </span>Опис проблеми</span>}
                name="description"
                rules={[{ required: true, message: 'Введіть опис проблеми' }]}
                style={{ marginBottom: 8 }}
              >
                <TextArea
                  rows={3}
                  placeholder="Детальний опис інциденту... (Ctrl+V для скріншотів)"
                  style={{ fontSize: 12 }}
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
                <div style={{ marginBottom: 8 }}>
                  <Space wrap size={4}>
                    {descriptionImages.map((img, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          border: '1px solid #d9d9d9',
                          borderRadius: 4,
                          backgroundColor: '#fafafa',
                          fontSize: 11,
                        }}
                      >
                        📷 {img.name}
                        <Button
                          type="text"
                          size="small"
                          danger
                          style={{ marginLeft: 4, padding: '0 2px', height: 16, fontSize: 10 }}
                          onClick={() => {
                            setDescriptionImages(prev => prev.filter((_, i) => i !== idx))
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

              <Form.Item label={<span style={{ fontSize: 12 }}>Файли</span>} style={{ marginBottom: 8 }}>
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

              {/* Логи станції */}
              <Form.Item label={<span style={{ fontSize: 12 }}>Логи станції</span>} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    overflow: 'hidden',
                    transition: 'border-color 0.3s',
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const files = e.dataTransfer?.files
                    if (!files || files.length === 0) return
                    const newFiles: UploadFile[] = []
                    for (let i = 0; i < files.length; i++) {
                      const f = files[i]
                      newFiles.push({
                        uid: `log-${Date.now()}-${i}`,
                        name: f.name,
                        size: f.size,
                        type: f.type,
                        originFileObj: f as any,
                        status: 'done',
                      })
                    }
                    setLogFiles(prev => [...prev, ...newFiles])
                    message.success(`Додано ${files.length} файл(ів)`)
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                >
                  {logFiles.length > 0 && (
                    <div style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                      {logFiles.map((file, idx) => (
                        <div key={file.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                          <span>📄 {file.name} {file.size ? `(${(file.size / 1024).toFixed(1)} KB)` : ''}</span>
                          <Button
                            type="text" size="small" danger
                            style={{ padding: '0 4px', height: 18, fontSize: 10 }}
                            onClick={() => setLogFiles(prev => prev.filter((_, i) => i !== idx))}
                          >✕</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <TextArea
                    rows={2}
                    placeholder="Вставте OCPP логи, текст або перетягніть файли..."
                    value={stationLogs}
                    onChange={(e) => {
                      setStationLogs(e.target.value)
                      saveFormDraft()
                    }}
                    style={{ fontSize: 12, border: 'none', boxShadow: 'none', resize: 'none' }}
                    tabIndex={11}
                  />
                </div>
              </Form.Item>

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
