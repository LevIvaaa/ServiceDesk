import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Space,
  Typography,
  message,
  Popconfirm,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HolderOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { incidentTypesApi, IncidentType } from '../../api/incidentTypes'
import TicketsList from './TicketsList'

const { Title } = Typography

export default function IncidentTypesManagement() {
  const [types, setTypes] = useState<IncidentType[]>([])
  const [originalTypes, setOriginalTypes] = useState<IncidentType[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<IncidentType | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [orderChanged, setOrderChanged] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  // Drag state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const fetchTypes = async () => {
    try {
      setLoading(true)
      const data = await incidentTypesApi.list()
      setTypes(data)
      setOriginalTypes(data)
      setOrderChanged(false)
    } catch (error) {
      message.error('Помилка завантаження типів інцидентів')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTypes()
  }, [])

  // Drag handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index
  }

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index
  }

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null
      dragOverItem.current = null
      return
    }

    const newTypes = [...types]
    const draggedItem = newTypes[dragItem.current]
    newTypes.splice(dragItem.current, 1)
    newTypes.splice(dragOverItem.current, 0, draggedItem)

    setTypes(newTypes)
    dragItem.current = null
    dragOverItem.current = null

    // Check if order changed vs original
    const changed = newTypes.some((t, i) => t.id !== originalTypes[i]?.id)
    setOrderChanged(changed)
  }

  const handleSaveOrder = async () => {
    try {
      setSavingOrder(true)
      const ids = types.map(t => t.id)
      const updated = await incidentTypesApi.reorder(ids)
      setTypes(updated)
      setOriginalTypes(updated)
      setOrderChanged(false)
      message.success('Порядок збережено')
    } catch (error) {
      message.error('Помилка збереження порядку')
    } finally {
      setSavingOrder(false)
    }
  }

  const handleResetOrder = () => {
    setTypes([...originalTypes])
    setOrderChanged(false)
  }

  const handleAdd = () => {
    setEditingType(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: IncidentType) => {
    setEditingType(record)
    form.setFieldsValue({ name: record.name })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      if (editingType) {
        await incidentTypesApi.update(editingType.id, { name: values.name })
        message.success('Тип інциденту оновлено')
      } else {
        await incidentTypesApi.create({ name: values.name })
        message.success('Тип інциденту створено')
      }

      setModalOpen(false)
      fetchTypes()
    } catch (error: any) {
      if (error?.response?.data?.detail) {
        message.error(error.response.data.detail)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await incidentTypesApi.delete(id)
      message.success('Тип інциденту видалено')
      fetchTypes()
    } catch (error) {
      message.error('Помилка видалення')
    }
  }

  const handleToggleActive = async (record: IncidentType) => {
    try {
      await incidentTypesApi.update(record.id, { is_active: !record.is_active })
      message.success(record.is_active ? 'Деактивовано' : 'Активовано')
      fetchTypes()
    } catch (error) {
      message.error('Помилка оновлення')
    }
  }

  return (
    <div>
      {/* Incident Types Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Типи інцидентів</Title>
        <Space>
          {orderChanged && (
            <>
              <Button
                icon={<UndoOutlined />}
                onClick={handleResetOrder}
              >
                Скасувати
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingOrder}
                onClick={handleSaveOrder}
              >
                Зберегти порядок
              </Button>
            </>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Додати тип інциденту
          </Button>
        </Space>
      </div>

      {/* Draggable table */}
      <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden', marginBottom: 32 }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 60px 1fr 130px 100px',
          padding: '10px 16px',
          background: '#fafafa',
          borderBottom: '1px solid #f0f0f0',
          fontWeight: 600,
          fontSize: 13,
        }}>
          <div></div>
          <div>ID</div>
          <div>Назва</div>
          <div>Статус</div>
          <div>Дії</div>
        </div>

        {/* Rows */}
        {types.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 60px 1fr 130px 100px',
              padding: '10px 16px',
              borderBottom: '1px solid #f0f0f0',
              cursor: 'grab',
              alignItems: 'center',
              background: '#fff',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <div><HolderOutlined style={{ color: '#999', fontSize: 16 }} /></div>
            <div style={{ fontSize: 13 }}>{item.id}</div>
            <div style={{ fontSize: 13 }}>{item.name}</div>
            <div>
              <Switch
                checked={item.is_active}
                onChange={() => handleToggleActive(item)}
                checkedChildren="Активний"
                unCheckedChildren="Неактивний"
                size="small"
              />
            </div>
            <div>
              <Space size={4}>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(item)} />
                <Popconfirm
                  title="Видалити тип інциденту?"
                  onConfirm={() => handleDelete(item.id)}
                  okText="Так"
                  cancelText="Ні"
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>
          </div>
        ))}

        {types.length === 0 && !loading && (
          <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
            Немає типів інцидентів
          </div>
        )}
      </div>

      {/* Tickets Section */}
      <Divider />
      <TicketsList />

      {/* Modal */}
      <Modal
        title={editingType ? 'Редагувати тип інциденту' : 'Новий тип інциденту'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Зберегти"
        cancelText="Скасувати"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Назва типу інциденту"
            rules={[{ required: true, message: 'Введіть назву' }]}
          >
            <Input placeholder="Наприклад: Фізична поломка" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
