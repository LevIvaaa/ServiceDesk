import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Typography,
  message,
  Space,
  Descriptions,
  Upload,
  List,
  Divider,
  Modal,
  Alert,
  Tag,
  Spin,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  ArrowLeftOutlined,
  UploadOutlined,
  DeleteOutlined,
  FileOutlined,
  EnvironmentOutlined,
  BankOutlined,
  RobotOutlined,
  MessageOutlined,
  CodeOutlined,
  WarningOutlined,
  PlusOutlined,
  BulbOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { ticketsApi, CreateTicketData, ParsedMessageData } from '../../api/tickets'
import { stationsApi, Station, CreateStationData } from '../../api/stations'
import { operatorsApi, Operator, CreateOperatorData } from '../../api/operators'
import { usersApi, User } from '../../api/users'
import { departmentsApi, Department } from '../../api/departments'
import { logAnalysisApi, LogAnalysisResponse } from '../../api/logAnalysis'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

// Helper function to format station label with both IDs
const formatStationLabel = (station: Station): string => {
  if (station.external_id) {
    return `${station.station_id} (${station.external_id}) - ${station.name}`
  }
  return `${station.station_id} - ${station.name}`
}

interface StationOption {
  value: number
  label: string
  station: Station
}

// Interface for pending entity creation data
interface PendingEntityData {
  stationId: string | null
  stationName: string | null
  stationAddress: string | null
  stationCity: string | null
  operatorName: string | null
  stationFound: boolean
  operatorFound: boolean
  operatorDbId: number | null
}

export default function CreateTicket() {
  const [form] = Form.useForm()
  const [createStationForm] = Form.useForm()
  const [createOperatorForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [stationSearchLoading, setStationSearchLoading] = useState(false)
  const [stationOptions, setStationOptions] = useState<StationOption[]>([])
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [logFiles, setLogFiles] = useState<UploadFile[]>([])
  const [customerMessage, setCustomerMessage] = useState('')
  const [parsingMessage, setParsingMessage] = useState(false)
  const [textLog, setTextLog] = useState('')
  // Modal states for missing entities
  const [showMissingEntityModal, setShowMissingEntityModal] = useState(false)
  const [pendingEntityData, setPendingEntityData] = useState<PendingEntityData | null>(null)
  const [pendingParsedData, setPendingParsedData] = useState<ParsedMessageData | null>(null)
  const [pendingOriginalMessage, setPendingOriginalMessage] = useState<string>('')
  const [creatingOperator, setCreatingOperator] = useState(false)
  const [creatingStation, setCreatingStation] = useState(false)
  const [showCreateOperatorForm, setShowCreateOperatorForm] = useState(false)
  const [showCreateStationForm, setShowCreateStationForm] = useState(false)
  const [newOperatorId, setNewOperatorId] = useState<number | null>(null)
  const [operatorsList, setOperatorsList] = useState<Operator[]>([])
  const [operatorsLoading, setOperatorsLoading] = useState(false)
  // Quick create modals (separate from missing entity modal)
  const [showQuickCreateStation, setShowQuickCreateStation] = useState(false)
  const [showQuickCreateOperator, setShowQuickCreateOperator] = useState(false)
  const [quickCreateStationForm] = Form.useForm()
  const [quickCreateOperatorForm] = Form.useForm()
  // Assignment fields
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [_selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  // Attachments (images/videos)
  const [attachmentFiles, setAttachmentFiles] = useState<UploadFile[]>([])
  const attachmentDropRef = useRef<HTMLDivElement>(null)
  // AI Log Analysis
  const [logAnalysisResult, setLogAnalysisResult] = useState<LogAnalysisResponse | null>(null)
  const [analyzingLog, setAnalyzingLog] = useState(false)
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('tickets')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load operators for the dropdown
  const loadOperators = async () => {
    try {
      setOperatorsLoading(true)
      const response = await operatorsApi.list({ is_active: true, per_page: 100 })
      setOperatorsList(response.items)
    } catch (error) {
      console.error('Failed to load operators:', error)
    } finally {
      setOperatorsLoading(false)
    }
  }

  // Load departments for assignment
  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true)
      const response = await departmentsApi.list({ is_active: true, per_page: 100 })
      setDepartments(response.items)
    } catch (error) {
      console.error('Failed to load departments:', error)
    } finally {
      setDepartmentsLoading(false)
    }
  }

  // Load users for assignment (optionally filtered by department)
  const loadUsers = async (departmentId?: number) => {
    try {
      setUsersLoading(true)
      const params: { is_active: boolean; per_page: number; department_id?: number } = {
        is_active: true,
        per_page: 100,
      }
      if (departmentId) {
        params.department_id = departmentId
      }
      const response = await usersApi.list(params)
      setUsers(response.items)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  // Load initial stations on component mount
  const loadInitialStations = async () => {
    try {
      setStationSearchLoading(true)
      const stations = await stationsApi.search('', 20, i18n.language)
      const options = stations.map((station) => ({
        value: station.id,
        label: formatStationLabel(station),
        station,
      }))
      setStationOptions(options)
    } catch (error) {
      console.error('Failed to load initial stations:', error)
    } finally {
      setStationSearchLoading(false)
    }
  }

  useEffect(() => {
    loadInitialStations()
    loadDepartments()
    loadUsers()
    loadOperators()
  }, [i18n.language])

  const handleStationSearch = async (searchValue: string) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        setStationSearchLoading(true)
        const stations = await stationsApi.search(searchValue || '', 20, i18n.language)
        const options = stations.map((station) => ({
          value: station.id,
          label: formatStationLabel(station),
          station,
        }))
        setStationOptions(options)
      } catch (error) {
        console.error('Failed to search stations:', error)
      } finally {
        setStationSearchLoading(false)
      }
    }, 300)
  }

  const handleStationSelect = (value: number) => {
    const selected = stationOptions.find((opt) => opt.value === value)
    if (selected) {
      setSelectedStation(selected.station)
      form.setFieldValue('station_id', value)
    }
  }

  const handleStationClear = () => {
    setSelectedStation(null)
    form.setFieldValue('station_id', undefined)
  }

  const handleLogFileRemove = (file: UploadFile) => {
    setLogFiles(logFiles.filter((f) => f.uid !== file.uid))
  }

  const handleLogFileBeforeUpload = (file: File) => {
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      message.error(`File ${file.name} is too large. Maximum size is 50MB`)
      return false
    }
    setLogFiles([...logFiles, { uid: Date.now().toString(), name: file.name, originFileObj: file } as UploadFile])
    return false // Prevent automatic upload
  }

  // Attachment handlers (images/videos)
  const handleAttachmentBeforeUpload = (file: File) => {
    const maxSize = 100 * 1024 * 1024 // 100MB for videos
    if (file.size > maxSize) {
      message.error(`File ${file.name} is too large. Maximum size is 100MB`)
      return false
    }
    const isImageOrVideo = file.type.startsWith('image/') || file.type.startsWith('video/')
    if (!isImageOrVideo) {
      message.error('Only images and videos are allowed')
      return false
    }
    addAttachmentFile(file)
    return false
  }

  const addAttachmentFile = (file: File) => {
    const uploadFile: UploadFile = {
      uid: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      originFileObj: file as any,
      type: file.type,
      size: file.size,
      thumbUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }
    setAttachmentFiles(prev => [...prev, uploadFile])
  }

  const handleAttachmentRemove = (file: UploadFile) => {
    if (file.thumbUrl) {
      URL.revokeObjectURL(file.thumbUrl)
    }
    setAttachmentFiles(prev => prev.filter(f => f.uid !== file.uid))
  }

  // Handle paste for images from clipboard
  const handlePasteAttachment = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
        const file = item.getAsFile()
        if (file) {
          const ext = file.type.split('/')[1] || 'png'
          const fileName = `pasted-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`
          const renamedFile = new File([file], fileName, { type: file.type })
          addAttachmentFile(renamedFile)
          message.success(t('attachments.pastedFromClipboard') || 'Image pasted from clipboard')
        }
      }
    }
  }

  // Handle paste in customer message field - extract images to attachments
  const handleCustomerMessagePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    let hasImages = false
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const ext = file.type.split('/')[1] || 'png'
          const fileName = `message-image-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`
          const renamedFile = new File([file], fileName, { type: file.type })
          addAttachmentFile(renamedFile)
          hasImages = true
        }
      }
    }

    if (hasImages) {
      message.info(t('attachments.imagesExtracted') || 'Images extracted to attachments')
    }
    // Text will be pasted normally by browser
  }

  const onFinish = async (values: CreateTicketData) => {
    try {
      setLoading(true)
      // Include AI log analysis if available
      const ticketData: CreateTicketData = {
        ...values,
        ...(logAnalysisResult && { ai_log_analysis: logAnalysisResult }),
      }
      const ticket = await ticketsApi.create(ticketData)

      // Upload log files if any
      if (logFiles.length > 0) {
        for (const logFile of logFiles) {
          if (logFile.originFileObj) {
            try {
              await ticketsApi.uploadLog(ticket.id, logFile.originFileObj)
            } catch (error) {
              console.error(`Failed to upload log file ${logFile.name}:`, error)
              message.warning(`Failed to upload log file: ${logFile.name}`)
            }
          }
        }
      }

      // Upload text log if provided
      if (textLog.trim()) {
        try {
          await ticketsApi.uploadTextLog(ticket.id, textLog)
        } catch (error) {
          console.error('Failed to upload text log:', error)
          message.warning(t('logs.textLogUploadError') || 'Failed to save text log')
        }
      }

      // Upload attachments (images/videos)
      if (attachmentFiles.length > 0) {
        for (const attachment of attachmentFiles) {
          if (attachment.originFileObj) {
            try {
              await ticketsApi.uploadAttachment(ticket.id, attachment.originFileObj)
            } catch (error) {
              console.error(`Failed to upload attachment ${attachment.name}:`, error)
              message.warning(`Failed to upload: ${attachment.name}`)
            }
          }
        }
      }

      message.success(t('common:messages.createSuccess') || 'Ticket created successfully')
      navigate(`/tickets/${ticket.id}`)
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('common:messages.error') || 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Helper to extract OCPP logs from message
  const extractLogsFromMessage = (message: string): string => {
    const lines = message.split('\n')
    const logLines: string[] = []
    let inLogSection = false

    for (const line of lines) {
      // Detect OCPP log patterns
      const isLogLine =
        line.includes('OcppIn') ||
        line.includes('OcppOut') ||
        line.includes('"connectorId"') ||
        line.includes('"status"') ||
        line.includes('"errorCode"') ||
        line.includes('"timestamp"') ||
        line.includes('StatusNotification') ||
        /^\d{4}-\d{2}-\d{2}/.test(line.trim()) || // Date format: 2025-12-25
        /^\s*"/.test(line) || // JSON content
        /^\s*\{/.test(line) ||
        /^\s*\}/.test(line) ||
        /^\s*\]/.test(line)

      if (isLogLine) {
        inLogSection = true
        logLines.push(line)
      } else if (inLogSection && line.trim() === '') {
        // Keep empty lines within log section
        logLines.push(line)
      } else if (inLogSection && !isLogLine && line.trim() !== '') {
        // Check if it's continuation of JSON
        if (line.trim().startsWith('"') || line.trim().startsWith('}') || line.trim().startsWith(']')) {
          logLines.push(line)
        }
      }
    }

    return logLines.join('\n').trim()
  }

  // Helper to fill form with parsed data
  const fillFormWithParsedData = async (parsed: ParsedMessageData, stationDbId?: number, originalMessage?: string) => {
    const formValues: Partial<CreateTicketData> = {}

    if (parsed.title) formValues.title = parsed.title

    // Combine AI description with original message
    if (parsed.description || originalMessage) {
      const aiDescription = parsed.description || ''
      const original = originalMessage || customerMessage
      formValues.description = `${aiDescription}\n\n========================================\n=== Оригінал повідомлення ===\n========================================\n${original}`
    }
    if (parsed.category) formValues.category = parsed.category
    if (parsed.priority) formValues.priority = parsed.priority
    if (parsed.reporter_name) formValues.reporter_name = parsed.reporter_name
    if (parsed.reporter_phone) formValues.reporter_phone = parsed.reporter_phone
    if (parsed.reporter_email) formValues.reporter_email = parsed.reporter_email
    if (parsed.port_number) formValues.port_number = parsed.port_number

    // Set station if found in database
    const finalStationId = stationDbId || parsed.station_db_id
    if (finalStationId) {
      formValues.station_id = finalStationId
      const stationOption = stationOptions.find(opt => opt.value === finalStationId)
      if (stationOption) {
        setSelectedStation(stationOption.station)
      } else {
        try {
          const station = await stationsApi.get(finalStationId)
          setSelectedStation(station)
          setStationOptions(prev => [...prev, {
            value: station.id,
            label: formatStationLabel(station),
            station,
          }])
        } catch (e) {
          console.error('Failed to load station:', e)
        }
      }
    }

    form.setFieldsValue(formValues)
  }

  const handleParseMessage = async () => {
    if (!customerMessage.trim()) {
      message.warning(t('parseMessage.emptyMessage') || 'Please enter a message to parse')
      return
    }

    try {
      setParsingMessage(true)
      const parsed: ParsedMessageData = await ticketsApi.parseMessage(customerMessage)

      console.log('Parsed message data:', parsed)

      // Extract OCPP logs from the original message and set to textLog field
      const extractedLogs = extractLogsFromMessage(customerMessage)
      if (extractedLogs) {
        setTextLog(extractedLogs)
        console.log('Extracted OCPP logs:', extractedLogs.substring(0, 200) + '...')
      }

      // Check if station or operator is missing from database
      const stationMissing = !!(parsed.station_id && !parsed.station_found)
      const operatorMissing = !!(parsed.operator_name && !parsed.operator_found)
      const hasMissingEntities = stationMissing || operatorMissing

      console.log('Missing entities check:', {
        stationMissing,
        operatorMissing,
        hasMissingEntities,
        'parsed.station_id': parsed.station_id,
        'parsed.station_found': parsed.station_found,
        'parsed.operator_name': parsed.operator_name,
        'parsed.operator_found': parsed.operator_found,
      })

      if (hasMissingEntities) {
        const entityData = {
          stationId: parsed.station_id,
          stationName: parsed.station_name,
          stationAddress: parsed.station_address,
          stationCity: parsed.station_city,
          operatorName: parsed.operator_name,
          stationFound: parsed.station_found,
          operatorFound: parsed.operator_found,
          operatorDbId: parsed.operator_db_id,
        }
        console.log('Setting pendingEntityData:', entityData)
        setPendingParsedData(parsed)
        setPendingOriginalMessage(customerMessage) // Save original message
        setPendingEntityData(entityData)
        setShowMissingEntityModal(true)
        // Load operators for the dropdown
        loadOperators()

        // Pre-fill create forms
        if (!parsed.operator_found && parsed.operator_name) {
          createOperatorForm.setFieldsValue({
            name: parsed.operator_name,
            code: parsed.operator_name?.toUpperCase().replace(/\s+/g, '_').substring(0, 20),
          })
        }
        if (!parsed.station_found && parsed.station_id) {
          createStationForm.setFieldsValue({
            station_id: parsed.station_id,
            name: parsed.station_name || '',
            address: parsed.station_address || '',
            city: parsed.station_city || '',
            operator_id: parsed.operator_db_id || undefined,
          })
        }
      } else {
        await fillFormWithParsedData(parsed, undefined, customerMessage)
        message.success(t('parseMessage.success') || 'Message parsed successfully!')
      }
    } catch (error: any) {
      console.error('Failed to parse message:', error)
      message.error(error.response?.data?.detail || t('parseMessage.error') || 'Failed to parse message')
    } finally {
      setParsingMessage(false)
    }
  }

  const handleSkipEntityCreation = async () => {
    setShowMissingEntityModal(false)
    if (pendingParsedData) {
      await fillFormWithParsedData(pendingParsedData, undefined, pendingOriginalMessage)
      message.success(t('parseMessage.success') || 'Message parsed successfully!')
    }
    setPendingParsedData(null)
    setPendingEntityData(null)
    setPendingOriginalMessage('')
  }

  const handleCreateOperator = async () => {
    try {
      const values = await createOperatorForm.validateFields()
      setCreatingOperator(true)
      const operator = await operatorsApi.create(values as CreateOperatorData)
      setNewOperatorId(operator.id)
      // Add newly created operator to the list
      setOperatorsList(prev => [operator, ...prev])
      message.success(t('parseMessage.operatorCreated') || 'Operator created!')
      setShowCreateOperatorForm(false)

      if (pendingEntityData && !pendingEntityData.stationFound && pendingEntityData.stationId) {
        createStationForm.setFieldsValue({ operator_id: operator.id })
        setShowCreateStationForm(true)
      } else {
        await finishEntityCreation()
      }
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.detail || 'Failed to create operator')
    } finally {
      setCreatingOperator(false)
    }
  }

  const handleCreateStation = async () => {
    try {
      const values = await createStationForm.validateFields()
      setCreatingStation(true)
      const station = await stationsApi.create(values as CreateStationData)
      message.success(t('parseMessage.stationCreated') || 'Station created!')
      setShowCreateStationForm(false)

      if (pendingParsedData) {
        await fillFormWithParsedData(pendingParsedData, station.id, pendingOriginalMessage)
        message.success(t('parseMessage.success') || 'Message parsed successfully!')
      }

      await loadInitialStations()
      setShowMissingEntityModal(false)
      setPendingParsedData(null)
      setPendingEntityData(null)
      setPendingOriginalMessage('')
      setNewOperatorId(null)
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.detail || 'Failed to create station')
    } finally {
      setCreatingStation(false)
    }
  }

  const finishEntityCreation = async () => {
    if (pendingParsedData) {
      await fillFormWithParsedData(pendingParsedData, undefined, pendingOriginalMessage)
      message.success(t('parseMessage.success') || 'Message parsed successfully!')
    }
    setShowMissingEntityModal(false)
    setPendingParsedData(null)
    setPendingEntityData(null)
    setPendingOriginalMessage('')
    setNewOperatorId(null)
  }

  // Quick create operator (from button near station selector)
  const handleQuickCreateOperator = async () => {
    try {
      const values = await quickCreateOperatorForm.validateFields()
      const operator = await operatorsApi.create(values as CreateOperatorData)
      setOperatorsList(prev => [operator, ...prev])
      message.success(t('parseMessage.operatorCreated') || 'Operator created!')
      setShowQuickCreateOperator(false)
      quickCreateOperatorForm.resetFields()
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.detail || 'Failed to create operator')
    }
  }

  // Quick create station (from button near station selector)
  const handleQuickCreateStation = async () => {
    try {
      const values = await quickCreateStationForm.validateFields()
      const station = await stationsApi.create(values as CreateStationData)
      message.success(t('parseMessage.stationCreated') || 'Station created!')
      setShowQuickCreateStation(false)
      quickCreateStationForm.resetFields()
      // Refresh stations and select the new one
      await loadInitialStations()
      setSelectedStation(station)
      form.setFieldsValue({ station_id: station.id })
      setStationOptions(prev => [{
        value: station.id,
        label: formatStationLabel(station),
        station,
      }, ...prev])
    } catch (error: any) {
      if (error.errorFields) return
      message.error(error.response?.data?.detail || 'Failed to create station')
    }
  }

  // Handle department change to filter users
  const handleDepartmentChange = (departmentId: number | undefined) => {
    setSelectedDepartmentId(departmentId || null)
    form.setFieldsValue({ assigned_user_id: undefined })
    if (departmentId) {
      loadUsers(departmentId)
    } else {
      loadUsers()
    }
  }

  // AI Log Analysis
  const handleAnalyzeLog = async () => {
    if (!textLog.trim()) {
      message.warning(t('logs.emptyLog', 'Введіть лог для аналізу'))
      return
    }

    try {
      setAnalyzingLog(true)
      const result = await logAnalysisApi.analyze({
        log_content: textLog,
        language: i18n.language,
      })
      setLogAnalysisResult(result)
      message.success(t('logs.analysisSuccess', 'Лог успішно проаналізовано'))
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('logs.analysisError', 'Помилка аналізу логу'))
    } finally {
      setAnalyzingLog(false)
    }
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
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tickets')}>
          {t('common:actions.back')}
        </Button>
      </Space>

      <Title level={2}>{t('create')}</Title>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          {/* Customer Message Parser Card */}
          <Card
            title={
              <Space>
                <MessageOutlined />
                <span>{t('parseMessage.title') || 'Customer Message'}</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
            extra={
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleParseMessage}
                loading={parsingMessage}
                disabled={!customerMessage.trim()}
              >
                {t('parseMessage.parse') || 'Parse with AI'}
              </Button>
            }
          >
            <TextArea
              rows={5}
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              onPaste={handleCustomerMessagePaste}
              placeholder={t('parseMessage.placeholder') || 'Paste customer message here (email, chat, etc.) and click "Parse with AI" to automatically fill form fields...'}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {t('parseMessage.hint') || 'AI will extract: title, description, category, priority, station ID, port number, and reporter contacts'}
            </Text>
            <Text type="secondary" style={{ display: 'block' }}>
              {t('parseMessage.imageHint') || 'If you paste images, they will be automatically added to attachments'}
            </Text>
          </Card>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ priority: 'medium', category: 'other' }}
          >
            {/* Station Selection Card */}
            <Card
              title={
                <Space>
                  <EnvironmentOutlined />
                  <span>{t('station.title') || 'Station'}</span>
                </Space>
              }
              style={{ marginBottom: 16 }}
              extra={
                <Space size="small">
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      loadOperators()
                      setShowQuickCreateOperator(true)
                    }}
                  >
                    {t('quickCreate.operator') || 'Add Operator'}
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      loadOperators()
                      setShowQuickCreateStation(true)
                    }}
                  >
                    {t('quickCreate.station') || 'Add Station'}
                  </Button>
                </Space>
              }
            >
              <Form.Item
                name="station_id"
                label={t('station.select') || 'Select Station'}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder={t('station.searchPlaceholder') || 'Search by station ID or name...'}
                  filterOption={false}
                  onSearch={handleStationSearch}
                  onSelect={handleStationSelect}
                  onClear={handleStationClear}
                  loading={stationSearchLoading}
                  notFoundContent={stationSearchLoading ? 'Loading...' : 'No stations found'}
                  options={stationOptions}
                />
              </Form.Item>

              {selectedStation && (
                <Card type="inner" size="small" style={{ backgroundColor: '#f5f5f5' }}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item
                      label={
                        <Space>
                          <BankOutlined />
                          <span>{t('station.operator') || 'Operator'}</span>
                        </Space>
                      }
                    >
                      <Text strong>{selectedStation.operator?.name || '-'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <Space>
                          <EnvironmentOutlined />
                          <span>{t('station.address') || 'Address'}</span>
                        </Space>
                      }
                    >
                      <Text>
                        {selectedStation.address || '-'}
                        {selectedStation.city && `, ${selectedStation.city}`}
                        {selectedStation.region && `, ${selectedStation.region}`}
                      </Text>
                    </Descriptions.Item>
                    {selectedStation.model && (
                      <Descriptions.Item label={t('station.model') || 'Model'}>
                        <Text>{selectedStation.model}</Text>
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {selectedStation.ports && selectedStation.ports.length > 0 && (
                    <>
                      <div style={{ marginTop: 12 }}>
                        <Text type="secondary">{t('station.selectPort') || 'Select port (optional)'}:</Text>
                      </div>
                      <Form.Item name="port_number" style={{ marginTop: 8, marginBottom: 0 }}>
                        <Select
                          allowClear
                          placeholder={t('station.portPlaceholder') || 'Select port...'}
                          style={{ width: '100%' }}
                        >
                          {selectedStation.ports.map((port) => (
                            <Option key={port.port_number} value={port.port_number}>
                              Port {port.port_number}
                              {port.connector_type && ` - ${port.connector_type}`}
                              {port.power_kw && ` (${port.power_kw} kW)`}
                              {port.status && ` - ${port.status}`}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </>
                  )}
                </Card>
              )}
            </Card>

            {/* Incident Information */}
            <Card title={t('incidentInfo') || 'Incident Information'} style={{ marginBottom: 16 }}>
              <Form.Item
                name="title"
                label={t('fields.title')}
                rules={[{ required: true, message: t('common:validation.required') }]}
              >
                <Input placeholder={t('fields.titlePlaceholder') || 'Brief description of the issue'} />
              </Form.Item>

              <Form.Item
                name="description"
                label={t('fields.description')}
                rules={[{ required: true, message: t('common:validation.required') }]}
              >
                <TextArea rows={4} placeholder={t('fields.descriptionPlaceholder') || 'Detailed description of the issue'} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="category"
                    label={t('category.label')}
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Option value="hardware">{t('category.hardware')}</Option>
                      <Option value="software">{t('category.software')}</Option>
                      <Option value="network">{t('category.network')}</Option>
                      <Option value="billing">{t('category.billing')}</Option>
                      <Option value="other">{t('category.other')}</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="priority" label={t('priority.label')}>
                    <Select>
                      <Option value="low">{t('priority.low')}</Option>
                      <Option value="medium">{t('priority.medium')}</Option>
                      <Option value="high">{t('priority.high')}</Option>
                      <Option value="critical">{t('priority.critical')}</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Reporter Information */}
            <Card
              type="inner"
              title={t('reporter.title')}
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="reporter_name" label={t('reporter.name')}>
                    <Input placeholder={t('reporter.namePlaceholder') || 'Client name'} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="reporter_phone" label={t('reporter.phone')}>
                    <Input placeholder="+380..." />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="reporter_email" label={t('reporter.email')}>
                    <Input placeholder="email@example.com" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Assignment (optional) */}
            <Card
              type="inner"
              title={t('assignment.title') || 'Assignment'}
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="assigned_department_id" label={t('assignment.department') || 'Department'}>
                    <Select
                      allowClear
                      placeholder={t('assignment.selectDepartment') || 'Select department...'}
                      loading={departmentsLoading}
                      onChange={handleDepartmentChange}
                    >
                      {departments.map((dept) => (
                        <Option key={dept.id} value={dept.id}>
                          {dept.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="assigned_user_id" label={t('assignment.assignee') || 'Assignee'}>
                    <Select
                      allowClear
                      showSearch
                      placeholder={t('assignment.selectAssignee') || 'Select assignee...'}
                      loading={usersLoading}
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {users.map((user) => (
                        <Option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Attachments (Images/Videos) */}
            <Card
              title={
                <Space>
                  <UploadOutlined />
                  <span>{t('attachments.title') || 'Attachments'}</span>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <div
                ref={attachmentDropRef}
                onPaste={handlePasteAttachment}
                tabIndex={0}
                style={{
                  border: '2px dashed #d9d9d9',
                  borderRadius: 8,
                  padding: 24,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#fafafa',
                  marginBottom: 16,
                }}
              >
                <Upload.Dragger
                  beforeUpload={handleAttachmentBeforeUpload}
                  showUploadList={false}
                  accept="image/*,video/*"
                  multiple
                  style={{ border: 'none', background: 'transparent' }}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                  </p>
                  <p className="ant-upload-text">
                    {t('attachments.dropHint') || 'Click or drag images/videos here, or paste from clipboard (Ctrl+V)'}
                  </p>
                  <p className="ant-upload-hint">
                    {t('attachments.formatHint') || 'Supported: JPG, PNG, GIF, MP4, MOV (max 100MB)'}
                  </p>
                </Upload.Dragger>
              </div>

              {attachmentFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {attachmentFiles.map((file) => (
                    <div
                      key={file.uid}
                      style={{
                        position: 'relative',
                        border: '1px solid #d9d9d9',
                        borderRadius: 8,
                        padding: 4,
                        width: 120,
                      }}
                    >
                      {file.thumbUrl ? (
                        <img
                          src={file.thumbUrl}
                          alt={file.name}
                          style={{
                            width: '100%',
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 4,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: 80,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f0f0f0',
                            borderRadius: 4,
                          }}
                        >
                          <FileOutlined style={{ fontSize: 24, color: '#999' }} />
                        </div>
                      )}
                      <div style={{ fontSize: 11, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#999' }}>
                        {file.size ? formatFileSize(file.size) : ''}
                      </div>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleAttachmentRemove(file)}
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          background: 'rgba(255,255,255,0.8)',
                          borderRadius: '50%',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Station Logs */}
            <Card
              title={
                <Space>
                  <FileOutlined />
                  <span>{t('logs.title') || 'Station Logs'}</span>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              {/* Text Log Input */}
              <div style={{ marginBottom: 16 }}>
                <Space style={{ marginBottom: 8 }}>
                  <CodeOutlined />
                  <Text strong>{t('logs.textLogTitle') || 'Paste Log Text'}</Text>
                </Space>
                <TextArea
                  rows={8}
                  value={textLog}
                  onChange={(e) => {
                    setTextLog(e.target.value)
                    setLogAnalysisResult(null) // Clear previous analysis
                  }}
                  placeholder={t('logs.textLogPlaceholder') || 'Paste OCPP logs, station output, or any text logs here...'}
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
                <Space style={{ marginTop: 8 }}>
                  <Button
                    type="primary"
                    icon={<RobotOutlined />}
                    onClick={handleAnalyzeLog}
                    loading={analyzingLog}
                    disabled={!textLog.trim()}
                  >
                    {t('logs.analyzeWithAI', 'Розшифрувати з AI')}
                  </Button>
                  <Text type="secondary">
                    {t('logs.textLogHint') || 'You can paste OCPP messages, station diagnostics, or any text output'}
                  </Text>
                </Space>
              </div>

              {/* AI Analysis Result */}
              {analyzingLog && (
                <div style={{ textAlign: 'center', padding: 24, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
                  <Spin />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">{t('logs.analyzing', 'AI аналізує лог...')}</Text>
                  </div>
                </div>
              )}

              {logAnalysisResult && !analyzingLog && (
                <Card
                  type="inner"
                  size="small"
                  title={
                    <Space>
                      <RobotOutlined style={{ color: '#1890ff' }} />
                      <span>{t('logs.aiAnalysis', 'AI Розшифровка')}</span>
                    </Space>
                  }
                  style={{ marginBottom: 16, background: '#f0f7ff' }}
                >
                  {/* Status */}
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>{t('logs.stationStatus', 'Статус станції')}: </Text>
                    <Tag color={getStatusColor(logAnalysisResult.status)} style={{ marginLeft: 8 }}>
                      {logAnalysisResult.status}
                    </Tag>
                  </div>

                  {/* Analysis */}
                  <div style={{ marginBottom: 12 }}>
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <Text strong>{t('logs.analysisSection', 'Аналіз')}</Text>
                    </Space>
                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                      {logAnalysisResult.analysis}
                    </div>
                  </div>

                  {/* Error Codes */}
                  {logAnalysisResult.error_codes.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <Space>
                        <WarningOutlined style={{ color: '#faad14' }} />
                        <Text strong>{t('logs.errorCodes', 'Коди помилок')}</Text>
                      </Space>
                      <div style={{ marginTop: 4 }}>
                        {logAnalysisResult.error_codes.map((code, idx) => (
                          <Tag key={idx} color="error" style={{ marginBottom: 4 }}>
                            {code}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {logAnalysisResult.recommendations.length > 0 && (
                    <div>
                      <Space>
                        <BulbOutlined style={{ color: '#1890ff' }} />
                        <Text strong>{t('logs.recommendations', 'Рекомендації')}</Text>
                      </Space>
                      <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                        {logAnalysisResult.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              )}

              <Divider>{t('logs.orUploadFile') || 'or upload files'}</Divider>

              {/* File Upload */}
              <Upload
                beforeUpload={handleLogFileBeforeUpload}
                showUploadList={false}
                accept=".log,.txt,.zip,.gz,.tar,.json,.xml,.csv"
                multiple
              >
                <Button icon={<UploadOutlined />}>
                  {t('logs.upload') || 'Upload Log Files'}
                </Button>
              </Upload>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                {t('logs.hint') || 'Supported formats: .log, .txt, .zip, .gz, .tar, .json, .xml, .csv (max 50MB per file)'}
              </Text>

              {logFiles.length > 0 && (
                <List
                  style={{ marginTop: 16 }}
                  size="small"
                  bordered
                  dataSource={logFiles}
                  renderItem={(file) => (
                    <List.Item
                      actions={[
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleLogFileRemove(file)}
                        />,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<FileOutlined />}
                        title={file.name}
                        description={file.originFileObj ? formatFileSize(file.originFileObj.size) : ''}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {t('create')}
                </Button>
                <Button onClick={() => navigate('/tickets')}>
                  {t('common:actions.cancel')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Col>
      </Row>

      {/* Modal for missing station/operator */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <span>{t('parseMessage.missingEntities') || 'Missing Data in Database'}</span>
          </Space>
        }
        open={showMissingEntityModal}
        onCancel={handleSkipEntityCreation}
        footer={null}
        width={600}
      >
        {pendingEntityData && !showCreateOperatorForm && !showCreateStationForm && (
          <>
            <Alert
              type="warning"
              message={t('parseMessage.missingEntitiesDesc') || 'The following items were not found in the database:'}
              style={{ marginBottom: 16 }}
            />

            <div style={{ marginBottom: 16 }}>
              {!pendingEntityData.operatorFound && pendingEntityData.operatorName && (
                <Card size="small" style={{ marginBottom: 8 }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Text strong>{t('parseMessage.operator') || 'Operator'}:</Text>{' '}
                      <Text>{pendingEntityData.operatorName}</Text>
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="small"
                        onClick={() => setShowCreateOperatorForm(true)}
                      >
                        {t('parseMessage.createOperator') || 'Create'}
                      </Button>
                    </Col>
                  </Row>
                </Card>
              )}

              {!pendingEntityData.stationFound && pendingEntityData.stationId && (
                <Card size="small">
                  <Row justify="space-between" align="middle">
                    <Col>
                      <div>
                        <Text strong>{t('parseMessage.station') || 'Station'}:</Text>{' '}
                        <Text>{pendingEntityData.stationId}</Text>
                        {pendingEntityData.stationName && (
                          <Text type="secondary"> - {pendingEntityData.stationName}</Text>
                        )}
                      </div>
                      {pendingEntityData.stationAddress && (
                        <div>
                          <Text type="secondary">{pendingEntityData.stationAddress}</Text>
                          {pendingEntityData.stationCity && (
                            <Text type="secondary">, {pendingEntityData.stationCity}</Text>
                          )}
                        </div>
                      )}
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="small"
                        onClick={() => {
                          if (!pendingEntityData.operatorFound && pendingEntityData.operatorName) {
                            setShowCreateOperatorForm(true)
                          } else {
                            setShowCreateStationForm(true)
                          }
                        }}
                      >
                        {t('parseMessage.createStation') || 'Create'}
                      </Button>
                    </Col>
                  </Row>
                </Card>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <Button onClick={handleSkipEntityCreation}>
                {t('parseMessage.skipAndContinue') || 'Skip and continue without adding'}
              </Button>
            </div>
          </>
        )}

        {/* Create Operator Form */}
        {showCreateOperatorForm && (
          <>
            <Title level={5}>{t('parseMessage.createOperatorTitle') || 'Create New Operator'}</Title>
            <Form form={createOperatorForm} layout="vertical">
              <Form.Item
                name="name"
                label={t('parseMessage.operatorName') || 'Operator Name'}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="code"
                label={t('parseMessage.operatorCode') || 'Code'}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="contact_phone" label={t('parseMessage.operatorPhone') || 'Contact Phone'}>
                <Input />
              </Form.Item>
              <Form.Item name="contact_email" label={t('parseMessage.operatorEmail') || 'Contact Email'}>
                <Input />
              </Form.Item>
            </Form>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setShowCreateOperatorForm(false)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button type="primary" onClick={handleCreateOperator} loading={creatingOperator}>
                  {t('common:actions.create')}
                </Button>
              </Space>
            </div>
          </>
        )}

        {/* Create Station Form */}
        {showCreateStationForm && (
          <>
            <Title level={5}>{t('parseMessage.createStationTitle') || 'Create New Station'}</Title>
            <Form form={createStationForm} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="station_id"
                    label={t('parseMessage.stationId') || 'Station ID'}
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="operator_id"
                    label={t('parseMessage.operatorId') || 'Operator'}
                    rules={[{ required: true, message: t('common:validation.required') }]}
                  >
                    <Select
                      showSearch
                      placeholder={t('parseMessage.selectOperator') || 'Select operator'}
                      loading={operatorsLoading}
                      disabled={!!newOperatorId}
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {operatorsList.map((op) => (
                        <Option key={op.id} value={op.id}>
                          {op.name} ({op.code})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="name"
                label={t('parseMessage.stationName') || 'Station Name'}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item name="address" label={t('parseMessage.stationAddress') || 'Address'}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="city" label={t('parseMessage.stationCity') || 'City'}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setShowCreateStationForm(false)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button type="primary" onClick={handleCreateStation} loading={creatingStation}>
                  {t('common:actions.create')}
                </Button>
              </Space>
            </div>
          </>
        )}
      </Modal>

      {/* Quick Create Operator Modal */}
      <Modal
        title={t('quickCreate.operatorTitle') || 'Add New Operator'}
        open={showQuickCreateOperator}
        onCancel={() => {
          setShowQuickCreateOperator(false)
          quickCreateOperatorForm.resetFields()
        }}
        onOk={handleQuickCreateOperator}
        okText={t('common:actions.create') || 'Create'}
        cancelText={t('common:actions.cancel') || 'Cancel'}
      >
        <Form form={quickCreateOperatorForm} layout="vertical">
          <Form.Item
            name="name"
            label={t('parseMessage.operatorName') || 'Operator Name'}
            rules={[{ required: true, message: t('common:validation.required') }]}
          >
            <Input placeholder="IONITY, DTEK, Yasno..." />
          </Form.Item>
          <Form.Item
            name="code"
            label={t('parseMessage.operatorCode') || 'Code'}
            rules={[{ required: true, message: t('common:validation.required') }]}
          >
            <Input placeholder="IONITY, DTEK..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contact_phone" label={t('parseMessage.operatorPhone') || 'Contact Phone'}>
                <Input placeholder="+380..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contact_email" label={t('parseMessage.operatorEmail') || 'Contact Email'}>
                <Input placeholder="email@operator.com" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Quick Create Station Modal */}
      <Modal
        title={t('quickCreate.stationTitle') || 'Add New Station'}
        open={showQuickCreateStation}
        onCancel={() => {
          setShowQuickCreateStation(false)
          quickCreateStationForm.resetFields()
        }}
        onOk={handleQuickCreateStation}
        okText={t('common:actions.create') || 'Create'}
        cancelText={t('common:actions.cancel') || 'Cancel'}
        width={600}
      >
        <Form form={quickCreateStationForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="station_id"
                label={t('parseMessage.stationId') || 'Station ID'}
                rules={[{ required: true, message: t('common:validation.required') }]}
              >
                <Input placeholder="1850, 2537..." />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="operator_id"
                label={t('parseMessage.operatorId') || 'Operator'}
                rules={[{ required: true, message: t('common:validation.required') }]}
              >
                <Select
                  showSearch
                  placeholder={t('parseMessage.selectOperator') || 'Select operator'}
                  loading={operatorsLoading}
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {operatorsList.map((op) => (
                    <Option key={op.id} value={op.id}>
                      {op.name} ({op.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="name"
            label={t('parseMessage.stationName') || 'Station Name'}
            rules={[{ required: true, message: t('common:validation.required') }]}
          >
            <Input placeholder="IONITY AC/DC by EF Палац Культури" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="address" label={t('parseMessage.stationAddress') || 'Address'}>
                <Input placeholder="вул. Хрещатик, 1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="city" label={t('parseMessage.stationCity') || 'City'}>
                <Input placeholder="Київ" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
