import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Space,
  Typography,
  message,
  Popconfirm,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { incidentTypesApi, IncidentType } from '../../api/incidentTypes'

const { Title } = Typography

export default function IncidentTypesManagement() {
  const [types, setTypes] = useState<IncidentType[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<IncidentType | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const fetchTypes = async () => {
    try {
      setLoading(true)
      const data = await incidentTypesApi.list()
      setTypes(data)
    } catch (error) {
      message.error('Помилка завантаження типів інцидентів')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTypes()
  }, [])

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

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Назва',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (active: boolean, record: IncidentType) => (
        <Switch
          checked={active}
          onChange={() => handleToggleActive(record)}
          checkedChildren="Активний"
          unCheckedChildren="Неактивний"
        />
      ),
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 120,
      render: (_: any, record: IncidentType) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Видалити тип інциденту?"
            onConfirm={() => handleDelete(record.id)}
            okText="Так"
            cancelText="Ні"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Редагування тікетів</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Додати тип інциденту
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={types}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
      />

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
