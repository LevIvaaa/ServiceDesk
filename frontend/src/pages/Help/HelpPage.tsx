import { Typography, Card, Collapse, Divider, Table, Tag } from 'antd'
import {
  ToolOutlined,
  TeamOutlined,
  SettingOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography
const { Panel } = Collapse

export default function HelpPage() {
  const rolesData = [
    {
      key: '1',
      role: 'Диспетчер',
      icon: <FileTextOutlined style={{ color: '#1890ff' }} />,
      description: 'Створює тікети, заповнює форму, призначає відповідальних, відстежує статус, додає коментарі.',
    },
    {
      key: '2',
      role: 'Інженер / Технік',
      icon: <ToolOutlined style={{ color: '#52c41a' }} />,
      description: 'Отримує призначені тікети, оновлює статус виконання, додає результати діагностики та коментарі.',
    },
    {
      key: '3',
      role: 'Менеджер / Супервайзер',
      icon: <TeamOutlined style={{ color: '#faad14' }} />,
      description: 'Переглядає всі тікети, контролює виконання, змінює пріоритети, перепризначає тікети, має доступ до експорту та звітності.',
    },
    {
      key: '4',
      role: 'Адміністратор',
      icon: <SettingOutlined style={{ color: '#f5222d' }} />,
      description: 'Керує користувачами та ролями, налаштовує систему, додає нових кореспондентів, керує довідниками (станції, моделі авто тощо).',
    },
  ]

  const rolesColumns = [
    {
      title: '',
      dataIndex: 'icon',
      key: 'icon',
      width: 50,
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      width: 200,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Опис можливостей',
      dataIndex: 'description',
      key: 'description',
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <FileTextOutlined /> Інструкція використання тікет-системи ECOFACTOR
      </Title>
      
      <Paragraph>
        Ця інструкція допоможе вам швидко розібратися з основними функціями системи обробки інцидентів.
      </Paragraph>

      <Divider />

      {/* Ролі в системі */}
      <Card title={<Title level={3}>Ролі в системі</Title>} style={{ marginBottom: 24 }}>
        <Paragraph>
          Кожна роль має свій набір прав та обов'язків. Кожна наступна роль має більш розширений доступ до компонентів системи.
        </Paragraph>
        <Table
          dataSource={rolesData}
          columns={rolesColumns}
          pagination={false}
          size="middle"
        />
      </Card>

      {/* Інструкції */}
      <Card title={<Title level={3}>Покрокові інструкції</Title>} style={{ marginBottom: 24 }}>
        <Collapse accordion>
          {/* Як створити тікет */}
          <Panel header={<Text strong>Як створити тікет</Text>} key="1">
            <ol style={{ paddingLeft: 20 }}>
              <li>Натисніть кнопку <Tag color="blue">Створити тікет</Tag></li>
              <li>Оберіть відділ, який буде обробляти тікет</li>
              <li>Введіть номер станції — система автоматично підтягне назву та адресу</li>
              <li>Оберіть тип порту (необов'язково)</li>
              <li>Заповніть модель авто (необов'язково)</li>
              <li>Вкажіть контактну інформацію клієнта (ім'я, телефон)</li>
              <li>Оберіть джерело звернення (телефон, email, тощо)</li>
              <li>Опишіть проблему у полі коментаря</li>
              <li>За потреби додайте вкладення та логи станції</li>
              <li>Натисніть <Tag color="blue">Зберегти</Tag> — номер тікету згенерується автоматично</li>
            </ol>
            <Paragraph type="secondary">
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> Форма автоматично зберігається при заповненні, тому ви не втратите дані при випадковому закритті.
            </Paragraph>
          </Panel>

          {/* Як працювати з тікетом */}
          <Panel header={<Text strong>Як працювати з тікетом</Text>} key="2">
            <Paragraph><Text strong>Відкриття тікету:</Text></Paragraph>
            <ul style={{ paddingLeft: 20 }}>
              <li>Клікніть на будь-яке місце в рядку тікету в таблиці</li>
              <li>Або натисніть на номер тікету</li>
            </ul>

            <Paragraph style={{ marginTop: 16 }}><Text strong>Зміна статусу:</Text></Paragraph>
            <ul style={{ paddingLeft: 20 }}>
              <li><Tag color="green">Прийняти в роботу</Tag> — для нових тікетів</li>
              <li><Tag>На аналіз</Tag> — якщо потрібен додатковий час на вирішення</li>
              <li><Tag color="blue">Перевіряється</Tag> — рішення знайдене, очікується підтвердження</li>
              <li><Tag color="red">Закрити тікет</Tag> — проблему вирішено</li>
            </ul>

            <Paragraph style={{ marginTop: 16 }}><Text strong>Додавання коментарів:</Text></Paragraph>
            <ul style={{ paddingLeft: 20 }}>
              <li>Прокрутіть до розділу "Коментарі"</li>
              <li>Введіть текст коментаря</li>
              <li>Натисніть <Tag color="blue">Надіслати</Tag></li>
              <li>Коментар буде видимий для всіх учасників</li>
            </ul>
          </Panel>

          {/* Навігація клавіатурою */}
          <Panel header={<Text strong>Навігація клавіатурою</Text>} key="3">
            <Paragraph>
              Для швидкого заповнення форми створення тікету використовуйте клавіатуру:
            </Paragraph>
            <ul style={{ paddingLeft: 20 }}>
              <li><Tag>Tab</Tag> — перехід до наступного поля</li>
              <li><Tag>Shift + Tab</Tag> — перехід до попереднього поля</li>
              <li><Tag>Enter</Tag> — вибір значення зі списку та перехід до наступного поля</li>
              <li><Tag>↑ ↓</Tag> — навігація по списку опцій у випадаючих меню</li>
            </ul>
          </Panel>

          {/* Експорт даних */}
          <Panel header={<Text strong>Експорт даних</Text>} key="4">
            <Paragraph>
              Для експорту списку тікетів у файл Excel:
            </Paragraph>
            <ol style={{ paddingLeft: 20 }}>
              <li>Перейдіть на сторінку "Тікети"</li>
              <li>За потреби застосуйте фільтри (статус, пріоритет, відділ тощо)</li>
              <li>Натисніть кнопку <Tag>Експорт</Tag></li>
              <li>Файл автоматично завантажиться на ваш комп'ютер</li>
            </ol>
            <Paragraph type="secondary">
              Файл містить всі дані про тікети, включаючи детальну інформацію про станції (номер, назва, адреса, власник).
            </Paragraph>
          </Panel>

          {/* Пошук станцій */}
          <Panel header={<Text strong>Пошук станцій</Text>} key="5">
            <Paragraph>
              При створенні тікету ви можете шукати станцію за:
            </Paragraph>
            <ul style={{ paddingLeft: 20 }}>
              <li><Text strong>Номером станції</Text> (наприклад: 879)</li>
              <li><Text strong>Назвою станції</Text> (наприклад: IONITY)</li>
              <li><Text strong>Адресою</Text></li>
            </ul>
            <Paragraph style={{ marginTop: 16 }}>
              Після вибору станції автоматично відобразиться інформаційний блок з деталями:
            </Paragraph>
            <ul style={{ paddingLeft: 20 }}>
              <li>Номер станції у локації</li>
              <li>ID станції (серійний номер вендора)</li>
              <li>Адреса</li>
              <li>Власник</li>
              <li>Виробник</li>
            </ul>
          </Panel>
        </Collapse>
      </Card>

      {/* Сценарії роботи */}
      <Card title={<Title level={3}>Типові сценарії роботи</Title>}>
        <Collapse accordion>
          <Panel header={<Text strong>Диспетчер</Text>} key="dispatcher">
            <ol style={{ paddingLeft: 20 }}>
              <li>Приймає дзвінок від клієнта</li>
              <li>Створює тікет з описом проблеми</li>
              <li>Призначає виконавця або відділ</li>
              <li>Відстежує статус виконання</li>
              <li>Додає коментарі при необхідності</li>
            </ol>
          </Panel>

          <Panel header={<Text strong>Інженер / Технік</Text>} key="engineer">
            <ol style={{ paddingLeft: 20 }}>
              <li>Отримує призначений тікет</li>
              <li>Натискає <Tag color="green">Прийняти в роботу</Tag></li>
              <li>Виїжджає на станцію або проводить діагностику</li>
              <li>Оновлює статус (<Tag>На аналіз</Tag> або <Tag color="blue">Перевіряється</Tag>)</li>
              <li>Додає коментар з результатами</li>
              <li>Закриває тікет після вирішення проблеми</li>
            </ol>
          </Panel>

          <Panel header={<Text strong>Менеджер / Супервайзер</Text>} key="manager">
            <ol style={{ paddingLeft: 20 }}>
              <li>Переглядає дашборд з усіма тікетами</li>
              <li>Контролює прострочені тікети</li>
              <li>Перепризначає тікети при потребі</li>
              <li>Змінює пріоритети</li>
              <li>Експортує дані для звітності</li>
            </ol>
          </Panel>

          <Panel header={<Text strong>Адміністратор</Text>} key="admin">
            <ol style={{ paddingLeft: 20 }}>
              <li>Додає нових користувачів</li>
              <li>Налаштовує права доступу</li>
              <li>Оновлює довідники (станції, оператори)</li>
              <li>Керує відділами</li>
              <li>Налаштовує інтеграції</li>
            </ol>
          </Panel>
        </Collapse>
      </Card>
    </div>
  )
}
