import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
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
import { useAuthStore } from '../../store/authStore'

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
  const { t, i18n } = useTranslation(['stations', 'common'])
  const { user: currentUser } = useAuthStore()
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
      // Normalize language to 'ua' or 'en'
      const lang = i18n.language?.startsWith('en') ? 'en' : 'ua'
      const response = await stationsApi.list({
        page,
        per_page: pageSize,
        search: search || undefined,
        operator_id: filterOperator,
        station_status: filterStatus,
        language: lang,
      })
      setStations(response.items)
      setTotal(response.total)
    } catch (error) {
      message.error(t('messages.loadError'))
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
  }, [page, pageSize, search, filterOperator, filterStatus, i18n.language])

  const handleCreate = () => {
    setEditingStation(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = async (id: number) => {
    try {
      const lang = i18n.language?.startsWith('en') ? 'en' : 'ua'
      const station = await stationsApi.get(id, lang)
      setEditingStation(station)
      form.setFieldsValue({
        ...station,
        installation_date: station.installation_date ? station.installation_date : undefined,
        last_maintenance_date: station.last_maintenance_date ? station.last_maintenance_date : undefined,
      })
      setModalVisible(true)
    } catch (error) {
      message.error(t('messages.stationLoadError'))
    }
  }

  const handleView = async (id: number) => {
    try {
      const lang = i18n.language?.startsWith('en') ? 'en' : 'ua'
      const station = await stationsApi.get(id, lang)
      setViewingStation(station)
      setDetailModalVisible(true)
    } catch (error) {
      message.error(t('messages.stationLoadError'))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await stationsApi.delete(id)
      message.success(t('messages.decommissioned'))
      fetchStations()
    } catch (error) {
      message.error(t('messages.deleteError'))
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
        message.success(t('messages.updated'))
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
        message.success(t('messages.created'))
      }
      setModalVisible(false)
      fetchStations()
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('messages.saveError'))
    }
  }

  const columns = [
    {
      title: t('fields.stationId'),
      dataIndex: 'station_id',
      key: 'station_id',
      width: 150,
    },
    {
      title: t('fields.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('fields.operator'),
      key: 'operator',
      render: (_: any, record: StationListItem) => record.operator?.name || '-',
    },
    {
      title: t('fields.address'),
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: t('fields.city'),
      dataIndex: 'city',
      key: 'city',
      width: 120,
    },
    {
      title: t('fields.model'),
      dataIndex: 'model',
      key: 'model',
      width: 120,
    },
    {
      title: t('common:actions.title'),
      key: 'actions',
      width: 150,
      render: (_: any, record: StationListItem) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record.id)}
          />
          {currentUser?.is_admin && (
            <>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record.id)}
              />
              <Popconfirm
                title={t('actions.decommission')}
                onConfirm={() => handleDelete(record.id)}
                okText={t('common:actions.yes')}
                cancelText={t('common:actions.no')}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2}>{t('title')}</Title>
        {currentUser?.is_admin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('create')}
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col>
            <Input
              placeholder={t('search')}
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder={t('fields.operator')}
              value={filterOperator}
              onChange={setFilterOperator}
              style={{ width: 200 }}
              allowClear
              options={operators.map(o => ({ value: o.id, label: o.name }))}
            />
          </Col>
          <Col>
            <Select
              placeholder={t('fields.status')}
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
              allowClear
              options={[
                { value: 'unknown', label: t('status.unknown') },
                { value: 'available', label: t('status.available') },
                { value: 'charging', label: t('status.charging') },
                { value: 'faulted', label: t('status.faulted') },
                { value: 'offline', label: t('status.offline') },
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
          showTotal: (total) => t('total', { count: total }),
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
      />

      {/* Create/Edit Station Modal */}
      <Modal
        title={editingStation ? t('edit') : t('create')}
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
                label={t('fields.stationId')}
                rules={[{ required: true, message: t('validation.idRequired') }]}
              >
                <Input placeholder={t('placeholders.stationId')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t('fields.name')}
                rules={[{ required: true, message: t('validation.nameRequired') }]}
              >
                <Input placeholder={t('placeholders.name')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="operator_id"
                label={t('fields.operator')}
                rules={[{ required: true, message: t('validation.operatorRequired') }]}
              >
                <Select
                  placeholder={t('placeholders.selectOperator')}
                  options={operators.map(o => ({ value: o.id, label: o.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="model" label={t('fields.model')}>
                <Input placeholder={t('placeholders.model')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="manufacturer" label={t('fields.manufacturer')}>
                <Input placeholder={t('placeholders.manufacturer')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="firmware_version" label={t('fields.firmwareVersion')}>
                <Input placeholder={t('placeholders.firmwareVersion')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label={t('fields.address')}>
            <Input placeholder={t('placeholders.address')} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label={t('fields.city')}>
                <Input placeholder={t('placeholders.city')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="region" label={t('fields.region')}>
                <Input placeholder={t('placeholders.region')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="installation_date" label={t('fields.installationDate')}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="latitude" label={t('fields.latitude')}>
                <InputNumber style={{ width: '100%' }} placeholder={t('placeholders.latitude')} step={0.0001} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="longitude" label={t('fields.longitude')}>
                <InputNumber style={{ width: '100%' }} placeholder={t('placeholders.longitude')} step={0.0001} />
              </Form.Item>
            </Col>
          </Row>

          {editingStation && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="status" label={t('fields.status')}>
                  <Select
                    options={[
                      { value: 'unknown', label: t('status.unknown') },
                      { value: 'available', label: t('status.available') },
                      { value: 'charging', label: t('status.charging') },
                      { value: 'faulted', label: t('status.faulted') },
                      { value: 'offline', label: t('status.offline') },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="last_maintenance_date" label={t('fields.lastMaintenance')}>
                  <Input type="date" />
                </Form.Item>
              </Col>
            </Row>
          )}

          {!editingStation && (
            <>
              <Title level={5} style={{ marginTop: 16 }}>{t('ports.title')}</Title>
              <Form.List name="ports">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row gutter={16} key={key}>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'port_number']}
                            label={t('ports.portNumber')}
                            rules={[{ required: true, message: t('validation.portNumberRequired') }]}
                          >
                            <InputNumber min={1} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'connector_type']}
                            label={t('ports.connectorType')}
                          >
                            <Select
                              placeholder={t('ports.connectorType')}
                              options={CONNECTOR_TYPES.map(t => ({ value: t, label: t }))}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            {...restField}
                            name={[name, 'power_kw']}
                            label={t('ports.maxPower')}
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
                        {t('ports.addPort')}
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
        title={`${t('title')}: ${viewingStation?.name}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            {t('common:actions.close')}
          </Button>,
          ...(currentUser?.is_admin ? [
            <Button key="edit" type="primary" onClick={() => {
              setDetailModalVisible(false)
              if (viewingStation) handleEdit(viewingStation.id)
            }}>
              {t('common:actions.edit')}
            </Button>,
          ] : []),
        ]}
        width={800}
      >
        {viewingStation && (
          <Tabs
            items={[
              {
                key: 'info',
                label: t('tabs.info'),
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label={t('fields.stationId')}>{viewingStation.station_id}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.name')}>{viewingStation.name}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.operator')}>{viewingStation.operator?.name}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.status')}>
                      <Tag color={STATUS_COLORS[viewingStation.status]}>{t(`status.${viewingStation.status}`)}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('fields.address')} span={2}>{viewingStation.address || '-'}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.city')}>{viewingStation.city || '-'}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.region')}>{viewingStation.region || '-'}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.model')}>{viewingStation.model || '-'}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.manufacturer')}>{viewingStation.manufacturer || '-'}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.firmwareVersion')}>{viewingStation.firmware_version || '-'}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.installationDate')}>{viewingStation.installation_date || '-'}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.lastMaintenance')}>{viewingStation.last_maintenance_date || '-'}</Descriptions.Item>
                    <Descriptions.Item label={t('fields.coordinates')}>
                      {viewingStation.latitude && viewingStation.longitude
                        ? `${viewingStation.latitude}, ${viewingStation.longitude}`
                        : '-'}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'ports',
                label: `${t('tabs.ports')} (${viewingStation.ports?.length || 0})`,
                icon: <ThunderboltOutlined />,
                children: (
                  <Table
                    dataSource={viewingStation.ports || []}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={[
                      { title: '№', dataIndex: 'port_number', key: 'port_number', width: 60 },
                      { title: t('ports.connectorType'), dataIndex: 'connector_type', key: 'connector_type' },
                      { title: t('ports.maxPower'), dataIndex: 'power_kw', key: 'power_kw' },
                      {
                        title: t('fields.status'),
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => (
                          <Tag color={STATUS_COLORS[status] || 'default'}>{t(`status.${status}`)}</Tag>
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
