import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  ru: {
    translation: {
      language: { ru: 'RU', en: 'EN' },
      common: { refresh: 'Обновить', logout: 'Выйти', all: 'Все', active: 'Активные', blocked: 'Заблокированные' },
      login: {
        eyebrow: 'Панель управления', title: 'Вход в CRM', description: 'Управляйте пользователями бота и доступами в одном месте.',
        username: 'Логин', password: 'Пароль', submit: 'Войти в панель', loading: 'Проверяем…',
      },
      dashboard: {
        adminPanel: 'Панель администратора', adminHint: 'Контроль доступов и клиентов бота', administrator: 'Администратор',
        nav: 'Управление', users: 'Пользователи', systemStatus: 'Состояние системы', online: 'Бот онлайн',
        eyebrow: 'Дашборд', title: 'Управление пользователями', description: 'Введите username и номер телефона оплатившего клиента вместе.',
      },
      stats: { total: 'Всего доступов', active: 'Активные доступы', linked: 'Подтверждено в Telegram', subscribers: 'Клиенты бота' },
      form: {
        eyebrow: 'Новый клиент', title: 'Добавить доступ', username: 'Telegram username', phone: 'Номер телефона',
        hint: 'Доступ откроется, только если контакт и username клиента совпадут.', submit: 'Разрешить доступ', loading: 'Добавляем…', success: 'Доступ успешно добавлен',
      },
      table: {
        title: 'Список доступов', description: 'Пара username и телефона подтверждается через Telegram', search: 'Поиск…',
        username: 'Username', phone: 'Телефон', verification: 'Проверка', status: 'Статус', created: 'Добавлен', actions: 'Действия',
        verified: 'Подтверждено', telegramId: 'Telegram ID: {{id}}', waiting: 'Ожидается контакт', active: 'Активен', blocked: 'Заблокирован',
        emptyTitle: 'Доступы не найдены', emptyHint: 'Добавьте нового клиента через форму справа.',
      },
      actions: { block: 'Заблокировать', activate: 'Активировать', delete: 'Удалить', deleteConfirm: 'Удалить доступ для @{{username}}?' },
      help: { title: 'Как это работает?', text: 'Клиент нажимает «Отправить мой номер». Бот проверяет владельца контакта, телефон и текущий username.' },
      errors: { login: 'Неверный логин или пароль либо сервер недоступен.', request: 'Не удалось выполнить операцию. Проверьте данные и попробуйте снова.' },
    },
  },
  en: {
    translation: {
      language: { ru: 'RU', en: 'EN' },
      common: { refresh: 'Refresh', logout: 'Sign out', all: 'All', active: 'Active', blocked: 'Blocked' },
      login: {
        eyebrow: 'Control center', title: 'Sign in to CRM', description: 'Manage bot users and access from one place.',
        username: 'Username', password: 'Password', submit: 'Sign in', loading: 'Checking…',
      },
      dashboard: {
        adminPanel: 'Admin panel', adminHint: 'Bot access and customer control', administrator: 'Administrator',
        nav: 'Management', users: 'Users', systemStatus: 'System status', online: 'Bot online',
        eyebrow: 'Dashboard', title: 'User management', description: 'Enter the paying customer’s username and phone number together.',
      },
      stats: { total: 'Total access', active: 'Active access', linked: 'Telegram verified', subscribers: 'Bot customers' },
      form: {
        eyebrow: 'New customer', title: 'Add access', username: 'Telegram username', phone: 'Phone number',
        hint: 'Access opens only when the customer’s contact and username both match.', submit: 'Grant access', loading: 'Adding…', success: 'Access added successfully',
      },
      table: {
        title: 'Access list', description: 'The username and phone pair is verified through Telegram', search: 'Search…',
        username: 'Username', phone: 'Phone', verification: 'Verification', status: 'Status', created: 'Created', actions: 'Actions',
        verified: 'Verified', telegramId: 'Telegram ID: {{id}}', waiting: 'Waiting for contact', active: 'Active', blocked: 'Blocked',
        emptyTitle: 'No access records found', emptyHint: 'Add a new customer using the form on the right.',
      },
      actions: { block: 'Block', activate: 'Activate', delete: 'Delete', deleteConfirm: 'Delete access for @{{username}}?' },
      help: { title: 'How does it work?', text: 'The customer taps “Send my phone number”. The bot checks the contact owner, phone number, and current username.' },
      errors: { login: 'Invalid username or password, or the server is unavailable.', request: 'The operation failed. Check the details and try again.' },
    },
  },
} as const

const savedLanguage = localStorage.getItem('crm-language')

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage === 'en' ? 'en' : 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
})

export default i18n
