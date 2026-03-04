import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Form,
  Input,
  Select,
  Button,
  message,
  Upload,
  Spin,
  Row,
  Col,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  PaperClipOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { ticketsApi } from '../../api/tickets'
import { stationsApi, StationListItem, Station, StationPort } from '../../api/stations'
import { departmentsApi, Department } from '../../api/departments'
import { incidentTypesApi, IncidentType } from '../../api/incidentTypes'
import { usersApi, User } from '../../api/users'

const { TextArea } = Input

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
  const [stationInfoExpanded, setStationInfoExpanded] = useState(false)
  const [attachmentFiles, setAttachmentFiles] = useState<UploadFile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([])
  const [incidentTypesLoading, setIncidentTypesLoading] = useState(false)
  const [logFiles, setLogFiles] = useState<UploadFile[]>([])
  const [stationLogs, setStationLogs] = useState('')
  const [departmentUsers, setDepartmentUsers] = useState<User[]>([])
  const [departmentUsersLoading, setDepartmentUsersLoading] = useState(false)

  const navigate = useNavigate()
  const { i18n } = useTranslation('tickets')

  // Load departments
  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true)
      const response = await departmentsApi.list({ is_active: true, per_page: 100, lang: i18n.language })
      setDepartments(response.items)
    } catch { /* ignore */ } finally { setDepartmentsLoading(false) }
  }

  // Load incident types
  const loadIncidentTypes = async () => {
    try {
      setIncidentTypesLoading(true)
      const data = await incidentTypesApi.list(true)
      setIncidentTypes(data)
    } catch { /* ignore */ } finally { setIncidentTypesLoading(false) }
  }

  // Load users by department
  const loadDepartmentUsers = async (deptId: number) => {
    try {
      setDepartmentUsersLoading(true)
      const response = await usersApi.list({ department_id: deptId, is_active: true, per_page: 100, lang: i18n.language })
      setDepartmentUsers(response.items)
    } catch { setDepartmentUsers([]) } finally { setDepartmentUsersLoading(false) }
  }

  // Search stations
  const searchStations = async (searchValue: string) => {
    const trimmed = searchValue.trim()
    if (!trimmed || trimmed.length < 2) { setStationOptions([]); return }
    try {
      setStationSearchLoading(true)
      const response = await stationsApi.list({ search: trimmed, per_page: 20, station_status: 'active,maintenance' })
      setStationOptions(response.items.map((s) => ({
        value: s.id,
        label: s.station_number ? `#${s.station_number} | ${s.station_id} — ${s.name}` : `${s.station_id} — ${s.name}`,
        station: s,
      })))
    } catch { /* ignore */ } finally { setStationSearchLoading(false) }
  }

  // Handle station selection
  const handleStationSelect = async (value: number) => {
    try {
      const lang = i18n.language?.startsWith('en') ? 'en' : 'ua'
      const fullStation = await stationsApi.get(value, lang)
      setSelectedStation(fullStation)
      setStationPorts(fullStation.ports || [])
      form.setFieldsValue({ station_id: value, port_type: undefined })
    } catch {
      message.error('Помилка завантаження станції')
    }
  }

  // Handle department change — load users and clear assignee
  const handleDepartmentChange = (deptId: number) => {
    form.setFieldValue('assigned_user_id', undefined)
    setDepartmentUsers([])
    if (deptId) loadDepartmentUsers(deptId)
  }

  useEffect(() => { loadDepartments(); loadIncidentTypes() }, [i18n.language])

  // Handle form submit
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      let category = 'other'
      const it = values.incident_type?.toLowerCase() || ''
      if (it.includes('софтов') || it.includes('баг')) category = 'software'
      else if (it.includes('фізичн') || it.includes('поломк')) category = 'hardware'
      else if (it.includes('перерахунок')) category = 'billing'
      else if (it.includes('звязок') || it.includes("зв'язок")) category = 'network'

      const ticketData: any = {
        title: values.incident_type || 'Новий інцидент',
        description: values.description,
        category,
        priority: values.priority || 'medium',
        incident_type: values.incident_type,
        station_id: values.station_id,
        port_type: values.port_type,
        vehicle: values.vehicle,
        reporter_name: values.reporter_name,
        reporter_phone: values.reporter_phone,
        station_logs: stationLogs || undefined,
        assigned_department_id: values.assigned_department_id,
        assigned_user_id: values.assigned_user_id || undefined,
        client_type: values.client_type,
      }

      const ticket = await ticketsApi.create(ticketData)

      // Upload all files
      for (const file of attachmentFiles) {
        if (file.originFileObj) await ticketsApi.uploadAttachment(ticket.id, file.originFileObj)
      }
      for (const file of logFiles) {
        if (file.originFileObj) await ticketsApi.uploadAttachment(ticket.id, file.originFileObj)
      }

      message.success('Тікет створено')
      if (onSuccess) onSuccess()
      else navigate(`/tickets/${ticket.id}`)
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Помилка створення тікета')
    } finally { setLoading(false) }
  }

  const labelStyle = { fontSize: 13, fontWeight: 600 as const, color: '#262626' }

  // Handle paste of images into description field
  const handleDescriptionPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        const ext = item.type.split('/')[1] || 'png'
        const filename = `screenshot_${Date.now()}.${ext}`
        const renamedFile = new File([file], filename, { type: file.type })
        const uploadFile: UploadFile = {
          uid: `paste-${Date.now()}`,
          name: filename,
          status: 'done',
          originFileObj: renamedFile as any,
        }
        setAttachmentFiles(prev => [...prev, uploadFile])
        // Insert marker into description via native DOM to ensure textarea updates
        const textarea = e.currentTarget
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const currentVal = textarea.value || ''
        const marker = `[📎 ${filename}]`
        const newVal = currentVal.substring(0, start) + marker + currentVal.substring(end)
        form.setFieldsValue({ description: newVal })
        // Force React to pick up the change
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(textarea, newVal)
          textarea.dispatchEvent(new Event('input', { bubbles: true }))
        }
        message.success(`Скріншот додано: ${filename}`)
        break
      }
    }
  }, [form])

  return (
    <div style={{ maxWidth: isModal ? '100%' : 560, margin: isModal ? 0 : '0 auto', padding: isModal ? 0 : '0 16px' }}>
      {!isModal && (
        <Button onClick={() => navigate('/tickets')} type="text" style={{ marginBottom: 16 }}>← Назад</Button>
      )}

      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '1px solid #e8f4f8',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>+ Новий тікет</span>
        </div>

        {/* Form */}
        <div style={{ padding: '16px 24px 24px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false} size="middle">

            {/* Відділ + Виконавець */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label={<span style={labelStyle}>Відділ</span>} name="assigned_department_id" style={{ marginBottom: 12 }}>
                  <Select placeholder="---" loading={departmentsLoading} showSearch optionFilterProp="children" onChange={handleDepartmentChange}>
                    {departments.map(d => <Select.Option key={d.id} value={d.id}>{d.name}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<span style={labelStyle}>Виконавець</span>} name="assigned_user_id" style={{ marginBottom: 12 }}>
                  <Select placeholder="---" allowClear loading={departmentUsersLoading} showSearch optionFilterProp="children"
                    disabled={departmentUsers.length === 0}
                    notFoundContent={departmentUsersLoading ? <Spin size="small" /> : 'Немає користувачів'}
                  >
                    {departmentUsers.map(u => <Select.Option key={u.id} value={u.id}>{u.first_name} {u.last_name}</Select.Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Проблема */}
            <Form.Item label={<span style={labelStyle}>Проблема</span>} name="incident_type" style={{ marginBottom: 12 }}>
              <Select placeholder="---" showSearch optionFilterProp="children" loading={incidentTypesLoading}>
                {incidentTypes.map(t => <Select.Option key={t.id} value={t.name}>{t.name}</Select.Option>)}
              </Select>
            </Form.Item>

            {/* Станція */}
            <Form.Item label={<span style={labelStyle}>Станція</span>} name="station_id" style={{ marginBottom: 4 }}>
              <Select showSearch placeholder="Пошук по номеру..." loading={stationSearchLoading} onSearch={searchStations} onChange={handleStationSelect} filterOption={false}
                onInputKeyDown={(e) => { if (e.key === ' ') { e.stopPropagation() } }}
                notFoundContent={stationSearchLoading ? <Spin size="small" /> : null}>
                {stationOptions.map(o => <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>)}
              </Select>
            </Form.Item>

            {/* Station info - collapsible */}
            {selectedStation && (
              <div style={{ marginBottom: 12, border: '1px solid #d4edda', borderRadius: 8, background: '#f6ffed', overflow: 'hidden' }}>
                <div
                  style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setStationInfoExpanded(!stationInfoExpanded)}
                >
                  <span style={{ fontSize: 13 }}>
                    <span style={{ color: '#52c41a', fontWeight: 600 }}>● Активна</span>
                    <span style={{ color: '#595959', marginLeft: 8 }}>{selectedStation.operator?.name || ''}</span>
                  </span>
                  {stationInfoExpanded ? <UpOutlined style={{ fontSize: 11, color: '#999' }} /> : <DownOutlined style={{ fontSize: 11, color: '#999' }} />}
                </div>
                {stationInfoExpanded && (
                  <div style={{ padding: '8px 12px 12px', borderTop: '1px solid #d4edda', fontSize: 12, color: '#595959' }}>
                    <Row gutter={16}>
                      <Col span={24} style={{ marginBottom: 6 }}>
                        <div style={{ color: '#999', fontSize: 11 }}>Адреса</div>
                        <div style={{ fontWeight: 500 }}>{selectedStation.address}{selectedStation.city ? `, ${selectedStation.city}` : ''}</div>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ color: '#999', fontSize: 11 }}>Власник</div>
                        <div style={{ fontWeight: 500 }}>{selectedStation.operator?.name || '—'}</div>
                      </Col>
                      <Col span={12}>
                        <div style={{ color: '#999', fontSize: 11 }}>Виробник</div>
                        <div style={{ fontWeight: 500 }}>{selectedStation.manufacturer || '—'}</div>
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 6 }}>
                      <Col span={24}>
                        <div style={{ color: '#999', fontSize: 11 }}>Порти</div>
                        <div style={{ fontWeight: 500 }}>{stationPorts.map(p => p.connector_type || `#${p.port_number}`).join(', ') || '—'}</div>
                      </Col>
                    </Row>
                  </div>
                )}
              </div>
            )}

            {/* Порт + Модель авто */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label={<span style={labelStyle}>Порт</span>} name="port_type" style={{ marginBottom: 12 }}>
                  <Select placeholder="---" disabled={!selectedStation || stationPorts.length === 0} showSearch optionFilterProp="children">
                    {stationPorts.map(p => (
                      <Select.Option key={p.id} value={p.connector_type || `Порт ${p.port_number}`}>
                        {p.connector_type || `Порт ${p.port_number}`}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<span style={labelStyle}>Модель авто</span>} name="vehicle" style={{ marginBottom: 12 }}>
                  <Input placeholder="напр. Tesla 3" />
                </Form.Item>
              </Col>
            </Row>

            {/* Пріоритет */}
            <Form.Item label={<span style={labelStyle}>Пріоритет</span>} name="priority" initialValue="medium" style={{ marginBottom: 12 }}>
              <Select>
                <Select.Option value="low">Низький</Select.Option>
                <Select.Option value="medium">Середній</Select.Option>
                <Select.Option value="high">Високий</Select.Option>
                <Select.Option value="critical">Критичний</Select.Option>
              </Select>
            </Form.Item>

            {/* Опис */}
            <Form.Item label={<span style={labelStyle}>Опис</span>} name="description" style={{ marginBottom: 12 }}>
              <TextArea rows={3} placeholder="Що сталося? (Ctrl+V для вставки скріншоту)" onPaste={handleDescriptionPaste} />
            </Form.Item>

            {/* Клієнт + Телефон */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label={<span style={labelStyle}>Клієнт</span>} name="reporter_name" style={{ marginBottom: 12 }}>
                  <Input placeholder="Ім'я" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label={<span style={labelStyle}>Телефон</span>} name="reporter_phone" style={{ marginBottom: 12 }}>
                  <Input placeholder="+380..." />
                </Form.Item>
              </Col>
            </Row>

            {/* OCPP логи */}
            <Form.Item label={<span style={labelStyle}>OCPP логи <span style={{ fontWeight: 400, color: '#999' }}>(опційно)</span></span>} style={{ marginBottom: 12 }}>
              <div
                style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}
                onDrop={(e) => {
                  e.preventDefault()
                  const files = e.dataTransfer?.files
                  if (!files || files.length === 0) return
                  const newFiles: UploadFile[] = []
                  for (let i = 0; i < files.length; i++) {
                    const f = files[i]
                    newFiles.push({ uid: `log-${Date.now()}-${i}`, name: f.name, size: f.size, type: f.type, originFileObj: f as any, status: 'done' })
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
                        <Button type="text" size="small" danger style={{ padding: '0 4px', height: 18, fontSize: 10 }}
                          onClick={() => setLogFiles(prev => prev.filter((_, i) => i !== idx))}>✕</Button>
                      </div>
                    ))}
                  </div>
                )}
                <TextArea rows={2} placeholder="Вставте логи..." value={stationLogs}
                  onChange={(e) => setStationLogs(e.target.value)}
                  style={{ border: 'none', boxShadow: 'none', resize: 'vertical' }} />
              </div>
            </Form.Item>

            {/* Додати файли */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Upload fileList={attachmentFiles} onChange={({ fileList }) => setAttachmentFiles(fileList)} beforeUpload={() => false} multiple>
                <Button icon={<PaperClipOutlined />} style={{ borderStyle: 'dashed', width: '100%' }}>Додати файли</Button>
              </Upload>
            </div>

            {/* Buttons */}
            <Row gutter={12}>
              <Col span={8}>
                <Button block onClick={() => isModal && onSuccess ? onSuccess() : navigate('/tickets')}>Скасувати</Button>
              </Col>
              <Col span={16}>
                <Button type="primary" htmlType="submit" loading={loading} block style={{ fontWeight: 600 }}>Зберегти</Button>
              </Col>
            </Row>

          </Form>
        </div>
      </div>
    </div>
  )
}
