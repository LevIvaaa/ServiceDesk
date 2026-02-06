import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  Typography,
  Tabs,
  List,
  Avatar,
  Input,
  Checkbox,
  message,
  Timeline,
  Divider,
  Row,
  Col,
  Modal,
  Image,
  Select,
  Form,
} from 'antd'
import {
  ArrowLeftOutlined,
  UserOutlined,
  CommentOutlined,
  HistoryOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  CodeOutlined,
} from '@ant-design/icons'
import { ticketsApi, Ticket, TicketComment, TicketHistory, TicketAttachment } from '../../api/tickets'
import { stationsApi, Station } from '../../api/stations'
import { usersApi, User } from '../../api/users'
import { departmentsApi, Department } from '../../api/departments'
import { useAuthStore } from '../../store/authStore'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [history, setHistory] = useState<TicketHistory[]>([])
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<TicketAttachment | null>(null)
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [statusComment, setStatusComment] = useState('')
  const [editForm] = Form.useForm()
  const [stationOptions, setStationOptions] = useState<Station[]>([])
  const [stationSearchLoading, setStationSearchLoading] = useState(false)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [stationPorts, setStationPorts] = useState<any[]>([])
  // Assignment state
  const [assignModalVisible, setAssignModalVisible] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [assignComment, setAssignComment] = useState('')
  const [usersLoading, setUsersLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation('tickets')
  const { hasPermission } = useAuthStore()
  const user = useAuthStore(state => state.user)

  // Проверяем, может ли пользователь редактировать тикет
  const canEditTicket = () => {
    if (!ticket || !user) return false
    if (user.is_admin) return true // Админы могут все
    
    // Если тикет назначен другому пользователю - только просмотр
    if (ticket.assigned_user_id && ticket.assigned_user_id !== user.id) {
      return false
    }
    
    // Если тикет в отделе пользователя и не назначен никому - можно редактировать
    if (ticket.assigned_department_id === user.department_id) {
      return true
    }
    
    // Если пользователь создал тикет (sender) - может редактировать свой
    if (ticket.created_by_id === user.id) {
      return true
    }
    
    return false
  }

  // Визначаємо доступні статуси залежно від ролі
  const getAvailableStatuses = () => {
    const allStatuses = ['new', 'open', 'in_progress', 'pending', 'resolved', 'closed']
    
    // Якщо користувач має роль handler, прибираємо статус 'closed'
    if (user && !user.is_admin && user.roles.some(role => role.name === 'handler')) {
      return allStatuses.filter(status => status !== 'closed')
    }
    
    return allStatuses
  }

  const statuses = getAvailableStatuses()
  const priorities = ['low', 'medium', 'high', 'critical']
  const categories = ['hardware', 'software', 'network', 'billing', 'other']

  // Функція для перекладу джерел звернення
  const getContactSourceLabel = (value: string | null) => {
    if (!value) return '-'
    const sources: Record<string, string> = {
      'phone': 'Телефон',
      'email': 'Email',
      'telegram': 'Telegram',
      'viber': 'Viber',
      'app': 'Мобільний додаток',
      'other': 'Інше',
    }
    return sources[value] || value
  }

  const fetchTicket = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await ticketsApi.get(parseInt(id))
      setTicket(data)
      setComments(data.comments || [])
      setHistory(data.history || [])
      const attachmentsList = (data as any).attachments || []
      setAttachments(attachmentsList)
      // Load attachment blob URLs for preview
      loadAttachmentUrls(attachmentsList, parseInt(id!))
    } catch (error) {
      message.error('Failed to load ticket')
      navigate('/tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
    // Cleanup blob URLs on unmount
    return () => {
      Object.values(attachmentUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [id])

  const loadAttachmentUrls = async (attachmentsList: TicketAttachment[], ticketId: number) => {
    const urls: Record<number, string> = {}
    for (const att of attachmentsList) {
      if (att.mime_type.startsWith('image/') || att.mime_type.startsWith('video/')) {
        try {
          const blob = await ticketsApi.downloadAttachment(ticketId, att.id)
          urls[att.id] = URL.createObjectURL(blob)
        } catch (e) {
          console.error('Failed to load attachment preview:', e)
        }
      }
    }
    setAttachmentUrls(urls)
  }

  const handleAddComment = async () => {
    if (!id || !newComment.trim()) return
    try {
      setSubmitting(true)
      const comment = await ticketsApi.addComment(parseInt(id), newComment, isInternal)
      setComments([...comments, comment])
      setNewComment('')
      message.success('Comment added')
    } catch (error) {
      message.error('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadAttachment = async (attachment: TicketAttachment) => {
    if (!id) return
    try {
      const blob = await ticketsApi.downloadAttachment(parseInt(id), attachment.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      message.error('Failed to download attachment')
    }
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!id) return
    try {
      await ticketsApi.deleteAttachment(parseInt(id), attachmentId)
      setAttachments(attachments.filter(a => a.id !== attachmentId))
      message.success('Attachment deleted')
    } catch (error) {
      message.error('Failed to delete attachment')
    }
  }

  const isImage = (mimeType: string) => mimeType.startsWith('image/')
  const isVideo = (mimeType: string) => mimeType.startsWith('video/')

  const openPreview = (attachment: TicketAttachment) => {
    setPreviewAttachment(attachment)
    setPreviewVisible(true)
  }

  const closePreview = () => {
    setPreviewVisible(false)
    setPreviewAttachment(null)
  }

  // Station search for edit modal
  const handleStationSearch = async (value: string) => {
    if (value.length < 2) {
      setStationOptions([])
      return
    }
    try {
      setStationSearchLoading(true)
      const lang = i18n.language?.startsWith('en') ? 'en' : 'ua'
      const stations = await stationsApi.search(value, 20, lang)
      setStationOptions(stations)
    } catch (error) {
      console.error('Station search error:', error)
    } finally {
      setStationSearchLoading(false)
    }
  }

  const handleStationSelect = (stationId: number) => {
    const station = stationOptions.find(s => s.id === stationId)
    if (station) {
      setSelectedStation(station)
      setStationPorts(station.ports || [])
      // Очищаем выбранный порт при смене станции
      editForm.setFieldsValue({ port_type: undefined })
    }
  }

  // Edit ticket handlers
  const openEditModal = async () => {
    if (ticket) {
      editForm.setFieldsValue({
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        station_id: ticket.station_id,
        port_type: ticket.port_type,
        reporter_name: ticket.reporter_name,
        reporter_phone: ticket.reporter_phone,
        reporter_email: ticket.reporter_email,
      })
      // Fetch full station data with ports for the dropdown
      if (ticket.station_id) {
        try {
          const lang = i18n.language?.startsWith('en') ? 'en' : 'ua'
          const fullStation = await stationsApi.get(ticket.station_id, lang)
          setSelectedStation(fullStation)
          setStationOptions([fullStation])
          setStationPorts(fullStation.ports || [])
        } catch (e) {
          // Fallback to ticket.station if fetch fails
          if (ticket.station) {
            setSelectedStation(ticket.station as any)
            setStationOptions([ticket.station as any])
            setStationPorts([])
          }
        }
      } else {
        setSelectedStation(null)
        setStationOptions([])
        setStationPorts([])
      }
      setEditModalVisible(true)
    }
  }

  const handleEditSubmit = async () => {
    if (!id || !ticket) return
    try {
      const values = await editForm.validateFields()
      setSubmitting(true)
      const updated = await ticketsApi.update(parseInt(id), values)
      setTicket({ ...ticket, ...updated })
      setEditModalVisible(false)
      message.success(t('messages.updated', 'Тікет оновлено'))
      fetchTicket() // Reload to get fresh history
    } catch (error) {
      message.error(t('messages.updateError', 'Помилка оновлення'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !ticket) return
    try {
      setSubmitting(true)
      await ticketsApi.updateStatus(parseInt(id), newStatus, statusComment || undefined)
      setTicket({ ...ticket, status: newStatus })
      setStatusModalVisible(false)
      setStatusComment('')
      message.success(t('messages.statusUpdated', 'Статус оновлено'))
      fetchTicket() // Reload to get fresh history
    } catch (error) {
      message.error(t('messages.statusError', 'Помилка зміни статусу'))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    if (!id || !ticket) return
    try {
      setSubmitting(true)
      await ticketsApi.update(parseInt(id), { priority: newPriority })
      setTicket({ ...ticket, priority: newPriority })
      message.success(t('messages.priorityUpdated', 'Пріоритет оновлено'))
      fetchTicket()
    } catch (error) {
      message.error(t('messages.priorityError', 'Помилка зміни пріоритету'))
    } finally {
      setSubmitting(false)
    }
  }

  // Assignment functions
  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true)
      const response = await departmentsApi.list({ is_active: true, per_page: 100 })
      setDepartments(response.items)
    } catch (error) {
      console.error('Failed to load departments:', error)
      message.error('Помилка завантаження відділів')
    } finally {
      setDepartmentsLoading(false)
    }
  }

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
      message.error('Помилка завантаження користувачів')
    } finally {
      setUsersLoading(false)
    }
  }

  const openAssignModal = async () => {
    // Pre-fill with current values
    setSelectedDepartmentId(ticket?.assigned_department_id || null)
    setSelectedUserId(ticket?.assigned_user_id || null)
    setAssignComment('')
    
    // Load data before opening modal
    await loadDepartments()
    if (ticket?.assigned_department_id) {
      await loadUsers(ticket.assigned_department_id)
    }
    
    setAssignModalVisible(true)
  }

  const handleDepartmentChange = (departmentId: number | undefined) => {
    setSelectedDepartmentId(departmentId || null)
    setSelectedUserId(null)
    if (departmentId) {
      loadUsers(departmentId)
    } else {
      loadUsers()
    }
  }

  const handleAssignSubmit = async () => {
    if (!id || !ticket) return
    try {
      setSubmitting(true)

      if (selectedDepartmentId) {
        // Delegate to department (optionally with user)
        await ticketsApi.delegate(
          parseInt(id),
          selectedDepartmentId,
          selectedUserId || undefined,
          assignComment || undefined
        )
      } else if (selectedUserId) {
        // Assign to user only
        await ticketsApi.assign(parseInt(id), selectedUserId, assignComment || undefined)
      } else {
        // Unassign
        await ticketsApi.assign(parseInt(id), null, assignComment || undefined)
      }

      setAssignModalVisible(false)
      message.success(t('messages.assigned', 'Тікет призначено'))
      fetchTicket()
    } catch (error) {
      message.error(t('messages.assignError', 'Помилка призначення'))
    } finally {
      setSubmitting(false)
    }
  }

  // Format history action for display
  const formatHistoryAction = (item: TicketHistory) => {
    const actionLabels: Record<string, string> = {
      created: t('history.actions.created', 'Створено тікет'),
      updated: t('history.actions.updated', 'Оновлено'),
      status_changed: t('history.actions.statusChanged', 'Змінено статус'),
      assigned: t('history.actions.assigned', 'Призначено'),
      delegated: t('history.actions.delegated', 'Делеговано'),
      commented: t('history.actions.commented', 'Додано коментар'),
      log_uploaded: t('history.actions.logUploaded', 'Завантажено лог'),
      log_deleted: t('history.actions.logDeleted', 'Видалено лог'),
      attachment_uploaded: t('history.actions.attachmentUploaded', 'Додано вкладення'),
      attachment_deleted: t('history.actions.attachmentDeleted', 'Видалено вкладення'),
    }

    let details = ''
    try {
      if (item.action === 'status_changed' && item.old_value && item.new_value) {
        const oldVal = JSON.parse(item.old_value)
        const newVal = JSON.parse(item.new_value)
        details = `${t(`status.${oldVal.status}`)} → ${t(`status.${newVal.status}`)}`
      } else if (item.action === 'updated' && item.old_value && item.new_value) {
        const oldVal = JSON.parse(item.old_value)
        const newVal = JSON.parse(item.new_value)
        const changes = Object.keys(newVal).map(key => {
          if (key === 'priority') {
            return `${t('fields.priority')}: ${t(`priority.${oldVal[key]}`)} → ${t(`priority.${newVal[key]}`)}`
          }
          if (key === 'category') {
            return `${t('category.label')}: ${t(`category.${oldVal[key]}`)} → ${t(`category.${newVal[key]}`)}`
          }
          return `${key}: ${oldVal[key] || '-'} → ${newVal[key] || '-'}`
        })
        details = changes.join(', ')
      } else if ((item.action === 'attachment_uploaded' || item.action === 'log_uploaded') && item.new_value) {
        const val = JSON.parse(item.new_value)
        details = val.filename || ''
      } else if ((item.action === 'attachment_deleted' || item.action === 'log_deleted') && item.old_value) {
        const val = JSON.parse(item.old_value)
        details = val.filename || ''
      }
    } catch (e) {
      // Ignore JSON parse errors
    }

    return {
      label: actionLabels[item.action] || item.action,
      details,
    }
  }

  const priorityColors: Record<string, string> = {
    low: 'green',
    medium: 'gold',
    high: 'orange',
    critical: 'red',
  }

  const statusColors: Record<string, string> = {
    new: 'blue',
    open: 'purple',
    in_progress: 'cyan',
    pending: 'gold',
    resolved: 'green',
    closed: 'default',
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!ticket) {
    return null
  }

  const tabItems = [
    {
      key: 'comments',
      label: (
        <span>
          <CommentOutlined />
          {t('comments.title')} ({comments.length})
        </span>
      ),
      children: (
        <div>
          <List
            itemLayout="horizontal"
            dataSource={comments}
            renderItem={(comment) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={
                    <Space>
                      <Text strong>
                        {comment.user.first_name} {comment.user.last_name}
                      </Text>
                      <Text type="secondary">
                        {dayjs(comment.created_at).format('DD.MM.YYYY HH:mm')}
                      </Text>
                      {comment.is_internal && (
                        <Tag color="orange">{t('comments.internal')}</Tag>
                      )}
                    </Space>
                  }
                  description={comment.content}
                />
              </List.Item>
            )}
          />
          {hasPermission('tickets.add_comment') && (
            <div style={{ marginTop: 16 }}>
              <TextArea
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('comments.placeholder')}
              />
              <Space style={{ marginTop: 8 }}>
                {hasPermission('tickets.view_internal_comments') && (
                  <Checkbox
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  >
                    {t('comments.internal')}
                  </Checkbox>
                )}
                <Button
                  type="primary"
                  onClick={handleAddComment}
                  loading={submitting}
                  disabled={!newComment.trim()}
                >
                  {t('comments.add')}
                </Button>
              </Space>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'attachments',
      label: (
        <span>
          <PaperClipOutlined />
          {t('attachments.title', 'Вкладення')} ({attachments.length})
        </span>
      ),
      children: (
        <div>
          {attachments.length === 0 ? (
            <Text type="secondary">{t('attachments.empty', 'Немає вкладень')}</Text>
          ) : (
            <Row gutter={[16, 16]}>
              {attachments.map((attachment) => (
                <Col key={attachment.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    size="small"
                    cover={
                      isImage(attachment.mime_type) && attachmentUrls[attachment.id] ? (
                        <img
                          alt={attachment.filename}
                          src={attachmentUrls[attachment.id]}
                          style={{ height: 150, objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => openPreview(attachment)}
                        />
                      ) : isVideo(attachment.mime_type) && attachmentUrls[attachment.id] ? (
                        <div
                          style={{ position: 'relative', cursor: 'pointer' }}
                          onClick={() => openPreview(attachment)}
                        >
                          <video
                            src={attachmentUrls[attachment.id]}
                            style={{ width: '100%', height: 150, objectFit: 'cover' }}
                            muted
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: 48,
                              color: 'rgba(255,255,255,0.8)',
                              textShadow: '0 0 10px rgba(0,0,0,0.5)',
                            }}
                          >
                            ▶
                          </div>
                        </div>
                      ) : (isImage(attachment.mime_type) || isVideo(attachment.mime_type)) && !attachmentUrls[attachment.id] ? (
                        <div
                          style={{
                            height: 150,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f5f5f5',
                          }}
                        >
                          <Spin />
                        </div>
                      ) : (
                        <div
                          style={{
                            height: 150,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f5f5f5',
                          }}
                        >
                          <PaperClipOutlined style={{ fontSize: 48, color: '#999' }} />
                        </div>
                      )
                    }
                    actions={[
                      <DownloadOutlined
                        key="download"
                        onClick={() => handleDownloadAttachment(attachment)}
                      />,
                      hasPermission('tickets.delete_attachments') && (
                        <DeleteOutlined
                          key="delete"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                        />
                      ),
                    ].filter(Boolean)}
                  >
                    <Card.Meta
                      title={
                        <Text ellipsis style={{ width: '100%' }} title={attachment.filename}>
                          {attachment.filename}
                        </Text>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {(attachment.file_size / 1024).toFixed(1)} KB
                        </Text>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          {t('history.title')}
        </span>
      ),
      children: (
        <Timeline
          items={history.map((item) => {
            const formatted = formatHistoryAction(item)
            return {
              children: (
                <div>
                  <Text strong>
                    {item.user.first_name} {item.user.last_name}
                  </Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {dayjs(item.created_at).format('DD.MM.YYYY HH:mm')}
                  </Text>
                  <br />
                  <Text>{formatted.label}</Text>
                  {formatted.details && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({formatted.details})
                    </Text>
                  )}
                </div>
              ),
            }
          })}
        />
      ),
    },
    {
      key: 'station_logs',
      label: (
        <span>
          <CodeOutlined />
          Логи станції
        </span>
      ),
      children: (
        <div>
          {ticket.station_logs ? (
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              maxHeight: '500px',
              overflow: 'auto',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0
            }}>
              {ticket.station_logs}
            </pre>
          ) : (
            <Text type="secondary">Логи станції відсутні</Text>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          {t('common:actions.back')}
        </Button>
        {hasPermission('tickets.edit') && canEditTicket() && (
          <Button icon={<EditOutlined />} onClick={openEditModal}>
            {t('common:actions.edit', 'Редагувати')}
          </Button>
        )}
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <Title level={4} style={{ margin: 0 }}>
                  {ticket.ticket_number}
                </Title>
                <Tag color={statusColors[ticket.status]}>
                  {t(`status.${ticket.status}`)}
                </Tag>
                <Tag color={priorityColors[ticket.priority]}>
                  {t(`priority.${ticket.priority}`)}
                </Tag>
              </Space>
            }
          >
            <Title level={5}>{ticket.title}</Title>
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</Paragraph>

            <Divider />

            <Tabs items={tabItems} />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Actions Card */}
          <Card title={t('actions.title', 'Дії')} style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* Status */}
              <div>
                <Text type="secondary">{t('fields.status', 'Статус')}:</Text>
                {hasPermission('tickets.change_status') && canEditTicket() ? (
                  <Select
                    value={ticket.status}
                    onChange={(val) => {
                      if (val === 'resolved' || val === 'closed') {
                        setPendingStatus(val)
                        setStatusModalVisible(true)
                      } else {
                        handleStatusChange(val)
                      }
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                    loading={submitting}
                  >
                    {statuses.map(s => (
                      <Select.Option key={s} value={s}>
                        <Tag color={statusColors[s]}>{t(`status.${s}`)}</Tag>
                      </Select.Option>
                    ))}
                  </Select>
                ) : (
                  <div style={{ marginTop: 4 }}>
                    <Tag color={statusColors[ticket.status]}>{t(`status.${ticket.status}`)}</Tag>
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <Text type="secondary">{t('fields.priority', 'Пріоритет')}:</Text>
                {hasPermission('tickets.edit') && canEditTicket() ? (
                  <Select
                    value={ticket.priority}
                    onChange={handlePriorityChange}
                    style={{ width: '100%', marginTop: 4 }}
                    loading={submitting}
                  >
                    {priorities.map(p => (
                      <Select.Option key={p} value={p}>
                        <Tag color={priorityColors[p]}>{t(`priority.${p}`)}</Tag>
                      </Select.Option>
                    ))}
                  </Select>
                ) : (
                  <div style={{ marginTop: 4 }}>
                    <Tag color={priorityColors[ticket.priority]}>{t(`priority.${ticket.priority}`)}</Tag>
                  </div>
                )}
              </div>

              {/* Close Ticket Button for Senders when status is resolved */}
              {user && 
               user.roles.some(role => role.name === 'sender') && 
               ticket.created_by_id === user.id && 
               ticket.status === 'resolved' && (
                <div>
                  <Button
                    type="primary"
                    onClick={() => {
                      setPendingStatus('closed')
                      setStatusModalVisible(true)
                    }}
                    loading={submitting}
                    style={{ marginTop: 8 }}
                  >
                    {t('actions.closeTicket', 'Закрити тікет')}
                  </Button>
                </div>
              )}

              {/* Assignment */}
              {hasPermission('tickets.assign') && canEditTicket() && (
                <div>
                  <Text type="secondary">{t('fields.assignment', 'Призначення')}:</Text>
                  <Button
                    type="default"
                    block
                    style={{ marginTop: 4 }}
                    onClick={openAssignModal}
                  >
                    {ticket.assigned_user
                      ? `${ticket.assigned_user.first_name} ${ticket.assigned_user.last_name}`
                      : ticket.assigned_department
                        ? ticket.assigned_department.name
                        : t('actions.assign', 'Призначити')}
                  </Button>
                </div>
              )}
            </Space>
          </Card>

          {/* Details Card */}
          <Card title={t('details.title', 'Деталі')}>
            <Descriptions column={1} size="small">
              {ticket.incident_type && (
                <Descriptions.Item label="Тип інциденту">
                  {ticket.incident_type}
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t('category.label')}>
                {t(`category.${ticket.category}`)}
              </Descriptions.Item>
              <Descriptions.Item label={t('fields.station')}>
                {ticket.station ? `${ticket.station.station_id} - ${ticket.station.name}` : '-'}
              </Descriptions.Item>
              {ticket.port_type && (
                <Descriptions.Item label="Тип порту">
                  {ticket.port_type}
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t('fields.assignedUser')}>
                {ticket.assigned_user
                  ? `${ticket.assigned_user.first_name} ${ticket.assigned_user.last_name}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('fields.assignedDepartment')}>
                {ticket.assigned_department?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('fields.createdBy')}>
                {ticket.created_by.first_name} {ticket.created_by.last_name}
              </Descriptions.Item>
              <Descriptions.Item label={t('fields.createdAt')}>
                {dayjs(ticket.created_at).format('DD.MM.YYYY HH:mm')}
              </Descriptions.Item>
              {ticket.sla_due_date && (
                <Descriptions.Item label={t('fields.slaDueDate')}>
                  <Tag color={ticket.sla_breached ? 'red' : 'blue'}>
                    {dayjs(ticket.sla_due_date).format('DD.MM.YYYY HH:mm')}
                  </Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {(ticket.reporter_name || ticket.reporter_phone || ticket.reporter_email || ticket.contact_source) && (
            <Card title={t('reporter.title')} style={{ marginTop: 16 }}>
              <Descriptions column={1} size="small">
                {ticket.reporter_name && (
                  <Descriptions.Item label={t('reporter.name')}>
                    {ticket.reporter_name}
                  </Descriptions.Item>
                )}
                {ticket.reporter_phone && (
                  <Descriptions.Item label={t('reporter.phone')}>
                    {ticket.reporter_phone}
                  </Descriptions.Item>
                )}
                {ticket.reporter_email && (
                  <Descriptions.Item label={t('reporter.email')}>
                    {ticket.reporter_email}
                  </Descriptions.Item>
                )}
                {ticket.contact_source && (
                  <Descriptions.Item label="Джерело звернення">
                    {getContactSourceLabel(ticket.contact_source)}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}
        </Col>
      </Row>

      {/* Preview Modal for images and videos */}
      <Modal
        open={previewVisible}
      onCancel={closePreview}
      footer={null}
      width="80%"
      style={{ top: 20 }}
      title={previewAttachment?.filename}
      destroyOnHidden
      >
        {previewAttachment && (
          <div style={{ textAlign: 'center' }}>
            {isImage(previewAttachment.mime_type) && attachmentUrls[previewAttachment.id] ? (
              <Image
                src={attachmentUrls[previewAttachment.id]}
                alt={previewAttachment.filename}
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
                preview={false}
              />
            ) : isVideo(previewAttachment.mime_type) && attachmentUrls[previewAttachment.id] ? (
              <video
                src={attachmentUrls[previewAttachment.id]}
                controls
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
            ) : null}
            <div style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadAttachment(previewAttachment)}
              >
                {t('common:actions.download', 'Завантажити')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Ticket Modal */}
      <Modal
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleEditSubmit}
        title={t('edit.title', 'Редагувати тікет')}
        okText={t('common:actions.save', 'Зберегти')}
        cancelText={t('common:actions.cancel', 'Скасувати')}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="title"
            label={t('fields.title', 'Заголовок')}
            rules={[{ required: true, message: t('validation.required', 'Обов\'язкове поле') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label={t('fields.description', 'Опис')}
            rules={[{ required: true, message: t('validation.required', 'Обов\'язкове поле') }]}
          >
            <TextArea rows={6} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label={t('category.label', 'Категорія')}
                rules={[{ required: true }]}
              >
                <Select>
                  {categories.map(c => (
                    <Select.Option key={c} value={c}>{t(`category.${c}`)}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label={t('fields.priority', 'Пріоритет')}
                rules={[{ required: true }]}
              >
                <Select>
                  {priorities.map(p => (
                    <Select.Option key={p} value={p}>
                      <Tag color={priorityColors[p]}>{t(`priority.${p}`)}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Station and Port */}
          <Divider>{t('fields.station', 'Станція')}</Divider>
          <Form.Item
            name="station_id"
            label={t('station.select', 'Оберіть станцію')}
          >
            <Select
              showSearch
              allowClear
              placeholder={t('station.searchPlaceholder', 'Пошук за ID або назвою...')}
              filterOption={false}
              onSearch={handleStationSearch}
              onSelect={handleStationSelect}
              onClear={() => {
                setSelectedStation(null)
              }}
              loading={stationSearchLoading}
              notFoundContent={stationSearchLoading ? 'Завантаження...' : 'Станції не знайдено'}
            >
              {stationOptions.map((station) => (
                <Select.Option key={station.id} value={station.id}>
                  {station.external_id
                    ? `${station.station_id} (${station.external_id}) - ${station.name}`
                    : `${station.station_id} - ${station.name}`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Тип порту */}
          <Form.Item
            name="port_type"
            label="Тип порту"
          >
            <Select
              allowClear
              placeholder={selectedStation ? "Оберіть тип порту..." : "Спочатку оберіть станцію"}
              showSearch
              optionFilterProp="children"
              disabled={!selectedStation || stationPorts.length === 0}
              notFoundContent={selectedStation && stationPorts.length === 0 ? "У станції немає портів" : null}
            >
              {stationPorts.map((port: any) => (
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

          {selectedStation && (
            <Card type="inner" size="small" style={{ backgroundColor: '#f5f5f5', marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">{t('station.operator', 'Оператор')}: </Text>
                  <Text strong>{selectedStation.operator?.name || '-'}</Text>
                </div>
                <div>
                  <Text type="secondary">{t('station.address', 'Адреса')}: </Text>
                  <Text>
                    {selectedStation.address || '-'}
                    {selectedStation.city && `, ${selectedStation.city}`}
                  </Text>
                </div>
              </Space>
            </Card>
          )}

          <Divider>{t('reporter.title', 'Заявник')}</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="reporter_name" label={t('reporter.name', 'Ім\'я')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="reporter_phone" label={t('reporter.phone', 'Телефон')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="reporter_email" label={t('reporter.email', 'Email')}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Status Change Modal (for resolved/closed with comment) */}
      <Modal
        open={statusModalVisible}
        onCancel={() => {
          setStatusModalVisible(false)
          setPendingStatus(null)
          setStatusComment('')
        }}
        onOk={() => {
          if (pendingStatus) {
            handleStatusChange(pendingStatus)
          }
        }}
        title={t('status.changeTitle', 'Зміна статусу')}
        okText={t('common:actions.confirm', 'Підтвердити')}
        cancelText={t('common:actions.cancel', 'Скасувати')}
        confirmLoading={submitting}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            {t('status.changeTo', 'Змінити статус на')}: {' '}
            <Tag color={statusColors[pendingStatus || '']}>
              {pendingStatus ? t(`status.${pendingStatus}`) : ''}
            </Tag>
          </Text>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">{t('status.commentHint', 'Додайте коментар (необов\'язково)')}</Text>
        </div>
        <TextArea
          rows={4}
          value={statusComment}
          onChange={(e) => setStatusComment(e.target.value)}
          placeholder={t('status.commentPlaceholder', 'Коментар...')}
        />
      </Modal>

      {/* Assignment Modal */}
      <Modal
        open={assignModalVisible}
        onCancel={() => {
          setAssignModalVisible(false)
          setAssignComment('')
        }}
        onOk={handleAssignSubmit}
        title={t('actions.assignTitle', 'Призначення тікета')}
        okText={t('common:actions.save', 'Зберегти')}
        cancelText={t('common:actions.cancel', 'Скасувати')}
        confirmLoading={submitting}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
              {t('fields.department', 'Відділ')}
            </Text>
            <Select
              allowClear
              placeholder={t('actions.selectDepartment', 'Оберіть відділ')}
              style={{ width: '100%' }}
              value={selectedDepartmentId}
              onChange={handleDepartmentChange}
              loading={departmentsLoading}
            >
              {departments.map(dept => (
                <Select.Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
              {t('fields.assignedUser', 'Виконавець')}
            </Text>
            <Select
              allowClear
              showSearch
              placeholder={t('actions.selectUser', 'Оберіть виконавця')}
              style={{ width: '100%' }}
              value={selectedUserId}
              onChange={(val) => setSelectedUserId(val || null)}
              loading={usersLoading}
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {users.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
              {t('actions.assignComment', 'Коментар (необов\'язково)')}
            </Text>
            <TextArea
              rows={3}
              value={assignComment}
              onChange={(e) => setAssignComment(e.target.value)}
              placeholder={t('actions.assignCommentPlaceholder', 'Додайте коментар до призначення...')}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}
