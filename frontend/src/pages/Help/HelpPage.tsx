import { Typography, Card, Collapse, Divider, Table, Tag } from 'antd'
import {
  UserOutlined,
  SettingOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store/authStore'

const { Title, Paragraph, Text } = Typography
const { Panel } = Collapse

export default function HelpPage() {
  const user = useAuthStore(state => state.user)
  const isAdmin = user?.is_admin

  const rolesData = [
    {
      key: '1',
      role: 'Користувач',
      icon: <UserOutlined style={{ color: '#1890ff' }} />,
      description: 'Створює тікети, приймає в роботу, делегує іншим користувачам, змінює статус, додає коментарі та вкладення, експортує дані.',
    },
    {
      key: '2',
      role: 'Адміністратор',
      icon: <SettingOutlined style={{ color: '#f5222d' }} />,
      description: 'Має всі можливості користувача + керує користувачами, відділами, операторами, станціями, типами інцидентів, може видаляти будь-які тікети та редагувати заголовки.',
    },
  ]

  const rolesColumns = [
    { title: '', dataIndex: 'icon', key: 'icon', width: 50 },
    { title: 'Роль', dataIndex: 'role', key: 'role', width: 200, render: (text: string) => <Text strong>{text}</Text> },
    { title: 'Опис можливостей', dataIndex: 'description', key: 'description' },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <FileTextOutlined /> Довідка — ECOFACTOR Service Desk
      </Title>
      <Paragraph>
        Система обробки інцидентів для зарядних станцій. Нижче описані основні функції та інструкції.
      </Paragraph>

      <Divider />

      <Card title={<Title level={3}>Ролі в системі</Title>} style={{ marginBottom: 24 }}>
        <Paragraph>
          У системі є дві ролі. Адміністратор має всі можливості користувача плюс доступ до управління системою.
        </Paragraph>
        <Table dataSource={rolesData} columns={rolesColumns} pagination={false} size="middle" />
      </Card>

      <Card title={<Title level={3}>Вкладки тікетів</Title>} style={{ marginBottom: 24 }}>
        <Paragraph>На сторінці "Тікети" доступні наступні вкладки:</Paragraph>
        <ul style={{ paddingLeft: 20 }}>
          <li><Text strong>Всі</Text> — всі тікети в системі з фільтрами (пошук, статус, пріоритет, категорія, відділ, створив)</li>
          <li><Text strong>Вхідні</Text> — нові тікети для вашого відділу, які ще не прийняті в роботу</li>
          <li><Text strong>В роботі</Text> — тікети вашого відділу зі статусом "В роботі" або "Очікує"</li>
          <li><Text strong>Мої тікети</Text> — тікети, призначені особисто вам</li>
          <li><Text strong>Делеговані</Text> — тікети, які вам делегували інші користувачі (з лічильником)</li>
          <li><Text strong>Завершені</Text> — тікети зі статусом "Перевіряється" або "Закрито"</li>
        </ul>
      </Card>

      <Card title={<Title level={3}>Статуси тікетів</Title>} style={{ marginBottom: 24 }}>
        <ul style={{ paddingLeft: 20 }}>
          <li><Tag color="blue">Новий</Tag> — тікет щойно створений, очікує прийняття</li>
          <li><Tag color="cyan">В роботі</Tag> — тікет прийнятий, ведеться робота</li>
          <li><Tag color="gold">Очікує</Tag> — робота призупинена, потрібна додаткова інформація</li>
          <li><Tag color="green">Перевіряється</Tag> — рішення знайдене, очікується підтвердження</li>
          <li><Tag>Закрито</Tag> — проблему вирішено</li>
        </ul>
      </Card>

      <Card title={<Title level={3}>Покрокові інструкції</Title>} style={{ marginBottom: 24 }}>
        <Collapse accordion>
          <Panel header={<Text strong>Як створити тікет</Text>} key="create">
            <ol style={{ paddingLeft: 20 }}>
              <li>Натисніть <Tag color="blue">Створити тікет</Tag></li>
              <li>Оберіть відділ для обробки тікету</li>
              <li>Оберіть тип інциденту</li>
              <li>Введіть номер або назву станції — система підтягне дані автоматично</li>
              <li>За потреби оберіть тип порту та модель авто</li>
              <li>Оберіть тип клієнта (B2B / B2C)</li>
              <li>Вкажіть контактні дані клієнта</li>
              <li>Опишіть проблему</li>
              <li>Додайте логи станції (текст або файли перетягуванням)</li>
              <li>За потреби оберіть виконавця з обраного відділу</li>
              <li>Натисніть <Tag color="blue">Зберегти</Tag></li>
            </ol>
          </Panel>

          <Panel header={<Text strong>Як прийняти тікет в роботу</Text>} key="accept">
            <ol style={{ paddingLeft: 20 }}>
              <li>Перейдіть на вкладку "Вхідні"</li>
              <li>Натисніть <Tag color="green">Прийняти</Tag> біля потрібного тікету</li>
              <li>Тікет автоматично перейде у статус "В роботі" та буде призначений вам</li>
            </ol>
          </Panel>

          <Panel header={<Text strong>Як делегувати тікет</Text>} key="delegate">
            <ol style={{ paddingLeft: 20 }}>
              <li>Відкрийте тікет</li>
              <li>Натисніть кнопку "Призначити" у блоці "Дії"</li>
              <li>Оберіть відділ та конкретного користувача</li>
              <li>За потреби додайте коментар</li>
              <li>Натисніть "Зберегти"</li>
            </ol>
            <Paragraph type="secondary">
              <CheckCircleOutlined style={{ color: '#52c41a' }} /> Делегувати можна в будь-якому статусі тікету, будь-якому користувачу.
            </Paragraph>
          </Panel>

          <Panel header={<Text strong>Як змінити статус тікету</Text>} key="status">
            <ol style={{ paddingLeft: 20 }}>
              <li>Відкрийте тікет</li>
              <li>У блоці "Дії" оберіть новий статус зі списку</li>
              <li>Для статусів "Перевіряється" та "Закрито" потрібно додати коментар</li>
            </ol>
          </Panel>

          <Panel header={<Text strong>Експорт тікетів</Text>} key="export">
            <ol style={{ paddingLeft: 20 }}>
              <li>Перейдіть на вкладку "Всі" на сторінці тікетів</li>
              <li>Застосуйте потрібні фільтри</li>
              <li>Натисніть <Tag>Експорт</Tag></li>
              <li>Файл Excel завантажиться автоматично</li>
            </ol>
          </Panel>

          <Panel header={<Text strong>Пошук станцій</Text>} key="stations">
            <Paragraph>При створенні тікету можна шукати станцію за:</Paragraph>
            <ul style={{ paddingLeft: 20 }}>
              <li>Номером станції</li>
              <li>Назвою станції</li>
              <li>Адресою</li>
            </ul>
            <Paragraph>Після вибору станції відобразиться блок з деталями: номер, ID, адреса, власник.</Paragraph>
          </Panel>
        </Collapse>
      </Card>

      {isAdmin && (
        <Card title={<Title level={3}>Функції адміністратора</Title>} style={{ marginBottom: 24 }}>
          <Collapse accordion>
            <Panel header={<Text strong>Управління користувачами</Text>} key="users">
              <ul style={{ paddingLeft: 20 }}>
                <li>Перейдіть у розділ "Користувачі" в бічному меню</li>
                <li>Додавайте нових користувачів кнопкою "Створити"</li>
                <li>Призначайте роль: Користувач або Адміністратор</li>
                <li>Прив'язуйте користувача до відділу</li>
                <li>Деактивуйте користувачів за потреби</li>
              </ul>
            </Panel>

            <Panel header={<Text strong>Управління відділами</Text>} key="departments">
              <ul style={{ paddingLeft: 20 }}>
                <li>Розділ "Відділи" — створення, редагування, деактивація відділів</li>
                <li>Кожен відділ має свій набір користувачів</li>
                <li>Тікети призначаються на відділ або конкретного користувача відділу</li>
              </ul>
            </Panel>

            <Panel header={<Text strong>Редагування типів інцидентів</Text>} key="incidents">
              <ul style={{ paddingLeft: 20 }}>
                <li>Розділ "Редагування тікетів" у бічному меню</li>
                <li>Додавайте, редагуйте та видаляйте типи інцидентів</li>
                <li>Змінюйте порядок перетягуванням</li>
              </ul>
            </Panel>

            <Panel header={<Text strong>Управління станціями та операторами</Text>} key="stations-admin">
              <ul style={{ paddingLeft: 20 }}>
                <li>Розділ "Станції" — перегляд, створення, редагування станцій</li>
                <li>Розділ "Оператори" — управління операторами зарядних станцій</li>
              </ul>
            </Panel>

            <Panel header={<Text strong>Видалення тікетів</Text>} key="delete">
              <Paragraph>
                Адміністратор може видалити будь-який тікет у будь-якому статусі. Кнопка видалення доступна у списку тікетів та на сторінці тікету.
              </Paragraph>
            </Panel>
          </Collapse>
        </Card>
      )}

      <Card title={<Title level={3}>Гарячі клавіші</Title>}>
        <ul style={{ paddingLeft: 20 }}>
          <li><Tag>Tab</Tag> — перехід до наступного поля</li>
          <li><Tag>Shift + Tab</Tag> — повернення до попереднього поля</li>
          <li><Tag>Enter</Tag> — вибір значення зі списку</li>
          <li><Tag>↑ ↓</Tag> — навігація по випадаючих списках</li>
        </ul>
      </Card>
    </div>
  )
}
