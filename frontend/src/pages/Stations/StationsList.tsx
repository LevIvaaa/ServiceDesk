import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Typography,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Descriptions,
  Tabs,
  InputNumber,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { stationsApi, StationListItem, Station, CreateStationData, UpdateStationData } from '../../api/stations'
import { operatorsApi, Operator } from '../../api/operators'

const { Title } = Typography

const STATUS_COLORS: Record<string, string> = {
  unknown: 'default',
  available: 'green',
  charging: 'blue',
  faulted: 'red',
  offline: 'orange',
  decommissioned: 'default',
}

const CONNECTOR_TYPES = ['CCS2', 'CHAdeMO', 'Type2', 'Type1', 'GBT']

export default function StationsList() {
  const { t } = useTranslation(['stations', 'common'])
  const [stations, setStations] = useState<StationListItem[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [filterOperator, setFilterOperator] = useState<number | undefined>()
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [modalVisible, setModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [editingStation, setEditingStation] = useState<Station | null>(null)
  const [viewingStation, setViewingStation] = useState<Station | null>(null)
  const [form] = Form.useForm()

  const fetchStations = async () => {
    setLoading(true)
    try {
      const response = await stationsApi.list({
        page,
        per_page: pageSize,
        search: search || undefined,
        operator_id: filterOperator,
        station_status: filterStatus,
      })
      setStations(response.items)
      setTotal(response.total)
    } catch (error) {
      message.error('Помилка завантаження станцій')
    } finally {
      setLoading(false)
    }
  }

  const fetchOperators = async () => {
    try {
      const response = await operatorsApi.list({ per_page: 100 })
      setOperators(response.items)
    } catch (error) {
      // Ignore
    }
  }

  useEffect(() => {
    fetchOperators()
  }, [])

  useEffect(() => {
    fetchStations()
  }, [page, pageSize, search, filterOperator, filterStatus])

  const handleCreate = () => {
    setEditingStation(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = async (id: number) => {
    try {
      const station = await stationsApi.get(id)
      setEditingStation(station)
      form.setFieldsValue({
        ...station,
        installation_date: station.installation_date ? station.installation_date : undefined,
        last_maintenance_date: station.last_maintenance_date ? station.last_maintenance_date : undefined,
      })
      setModalVisible(true)
    } catch (error) {
      message.error('Помилка завантаження станції')
    }
  }

  const handleView = async (id: number) => {
    try {
      const station = await stationsApi.get(id)
      setViewingStation(station)
      setDetailModalVisible(true)
    } catch (error) {
      message.error('Помилка завантаження станції')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await stationsApi.delete(id)
      message.success('Станцію виведено з експлуатації')
      fetchStations()
    } catch (error) {
      message.error('Помилка видалення станції')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingStation) {
        const updateData: UpdateStationData = {
          station_id: values.station_id,
          name: values.name,
          operator_id: values.operator_id,
          address: values.address,
          city: values.city,
          region: values.region,
          latitude: values.latitude,
          longitude: values.longitude,
          model: values.model,
          manufacturer: values.manufacturer,
          firmware_version: values.firmware_version,
          installation_date: values.installation_date,
          last_maintenance_date: values.last_maintenance_date,
          status: values.status,
        }
        await stationsApi.update(editingStation.id, updateData)
        message.success('Станцію успішно оновлено')
      } else {
        const createData: CreateStationData = {
          station_id: values.station_id,
          name: values.name,
          operator_id: values.operator_id,
          address: values.address,
          city: values.city,
          region: values.region,
          latitude: values.latitude,
          longitude: values.longitude,
          model: values.model,
          manufacturer: values.manufacturer,
          firmware_version: values.firmware_version,
          installation_date: values.installation_date,
          ports: values.ports || [],
        }
        await stationsApi.create(createData)
        message.success('Станцію успішно створено')
      }
      setModalVisible(false)
      fetchStations()
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Помилка збереження')
    }
  }

  const columns = [
    {
      title: 'ID станції',
      dataIndex: 'station_id',
      key: 'station_id',
      width: 150,
    },
    {
      title: 'Назва',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Оператор',
      key: 'operator',
      render: (_: any, record: StationListItem) => record.operator?.name || '-',
    },
    {
      title: 'Адреса',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: 'Місто',
      dataIndex: 'city',
      key: 'city',
      width: 120,
    },
    {
      title: 'Модель',
      dataIndex: 'model',
      key: 'model',
      width: 120,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Дії',
      key: 'actions',
      width: 150,
      render: (_: any, record: StationListItem) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record.id)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          />
          <Popconfirm
            title="Вивести станцію з експлуатації?"
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>Станції</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Додати станцію
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col>
            <Input
              placeholder="Пошук..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="Оператор"
              value={filterOperator}
              onChange={setFilterOperator}
              style={{ width: 200 }}
              allowClear
              options={operators.map(o => ({ value: o.id, label: o.name }))}
            />
          </Col>
          <Col>
            <Select
              placeholder="Статус"
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
              allowClear
              options={[
                { value: 'unknown', label: 'Невідомо' },
                { value: 'available', label: 'Доступна' },
                { value: 'charging', label: 'Заряджає' },
                { value: 'faulted', label: 'Несправна' },
                { value: 'offline', label: 'Офлайн' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={stations}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `Всього: ${total}`,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
      />

      {/* Create/Edit Station Modal */}
      <Modal
        title={editingStation ? 'Редагувати станцію' : 'Додати станцію'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="station_id"
                label="ID станції"
                rules={[{ required: true, message: "ID обов'язковий" }]}
              >
                <Input placeholder="CHG-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Назва"
                rules={[{ required: true, message: "Назва обов'язкова" }]}
              >
                <Input placeholder="Зарядна станція #1" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="operator_id"
                label="Оператор"
                rules={[{ required: true, message: "Оператор обов'язковий" }]}
              >
                <Select
                  placeholder="Оберіть оператора"
                  options={operators.map(o => ({ value: o.id, label: o.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label="Модель">
                <Input placeholder="ABB Terra 54" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="manufacturer" label="Виробник">
                <Input placeholder="ABB" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="firmware_version" label="Версія прошивки">
                <Input placeholder="v1.2.3" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Адреса">
            <Input placeholder="вул. Хрещатик, 1" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label="Місто">
                <Input placeholder="Київ" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="region" label="Область">
                <Input placeholder="Київська" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="installation_date" label="Дата встановлення">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="latitude" label="Широта">
                <InputNumber style={{ width: '100%' }} placeholder="50.4501" step={0.0001} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="longitude" label="Довгота">
                <InputNumber style={{ width: '100%' }} placeholder="30.5234" step={0.0001} />
              </Form.Item>
            </Col>
          </Row>

          {editingStation && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="status" label="Статус">
                  <Select
                    options={[
                      { value: 'unknown', label: 'Невідомо' },
                      { value: 'available', label: 'Доступна' },
                      { value: 'charging', label: 'Заряджає' },
                      { value: 'faulted', label: 'Несправна' },
                      { value: 'offline', label: 'Офлайн' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="last_maintenance_date" label="Останнє ТО">
                  <Input type="date" />
                </Form.Item>
              </Col>
            </Row>
          )}

          {!editingStation && (
            <>
              <Title level={5} style={{ marginTop: 16 }}>Порти (конектори)</Title>
              <Form.List name="ports">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row gutter={16} key={key}>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'port_number']}
                            label="Номер порту"
                            rules={[{ required: true }]}
                          >
                            <InputNumber min={1} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'connector_type']}
                            label="Тип конектора"
                          >
                            <Select
                              placeholder="Тип"
                              options={CONNECTOR_TYPES.map(t => ({ value: t, label: t }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'power_kw']}
                            label="Потужність (кВт)"
                          >
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Form.Item label=" ">
                            <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                          </Form.Item>
                        </Col>
                      </Row>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Додати порт
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {t('common:actions.save')}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                {t('common:actions.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Station Detail Modal */}
      <Modal
        title={`Станція: ${viewingStation?.name}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Закрити
          </Button>,
          <Button key="edit" type="primary" onClick={() => {
            setDetailModalVisible(false)
            if (viewingStation) handleEdit(viewingStation.id)
          }}>
            Редагувати
          </Button>,
        ]}
        width={800}
      >
        {viewingStation && (
          <Tabs
            items={[
              {
                key: 'info',
                label: 'Інформація',
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="ID станції">{viewingStation.station_id}</Descriptions.Item>
                    <Descriptions.Item label="Назва">{viewingStation.name}</Descriptions.Item>
                    <Descriptions.Item label="Оператор">{viewingStation.operator?.name}</Descriptions.Item>
                    <Descriptions.Item label="Статус">
                      <Tag color={STATUS_COLORS[viewingStation.status]}>{viewingStation.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Адреса" span={2}>{viewingStation.address || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Місто">{viewingStation.city || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Область">{viewingStation.region || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Модель">{viewingStation.model || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Виробник">{viewingStation.manufacturer || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Прошивка">{viewingStation.firmware_version || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Дата встановлення">{viewingStation.installation_date || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Останнє ТО">{viewingStation.last_maintenance_date || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Координати">
                      {viewingStation.latitude && viewingStation.longitude
                        ? `${viewingStation.latitude}, ${viewingStation.longitude}`
                        : '-'}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'ports',
                label: `Порти (${viewingStation.ports?.length || 0})`,
                icon: <ThunderboltOutlined />,
                children: (
                  <Table
                    dataSource={viewingStation.ports || []}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={[
                      { title: '№', dataIndex: 'port_number', key: 'port_number', width: 60 },
                      { title: 'Тип конектора', dataIndex: 'connector_type', key: 'connector_type' },
                      { title: 'Потужність (кВт)', dataIndex: 'power_kw', key: 'power_kw' },
                      {
                        title: 'Статус',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => (
                          <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>
                        ),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  )
}
