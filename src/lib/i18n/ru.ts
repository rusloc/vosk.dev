import type { Dictionary } from "./en";

/**
 * Russian message catalog. Draft translations — pending a native/technical
 * review (BI terminology in particular). Must satisfy the `Dictionary` shape.
 */
export const ru: Dictionary = {
  meta: {
    title: "VOSK — BI-аналитик и разработчик на фрилансе",
    description:
      "BI-аналитик и разработчик на фрилансе. Дашборды, дата-пайплайны и аналитика, которые превращают сырые данные в решения.",
  },
  nav: {
    home: "Главная",
    work: "Портфолио",
    blog: "Блог",
    services: "Услуги",
    contact: "Контакты",
    message: "Написать",
    openMenu: "Открыть меню",
  },
  langSwitcher: {
    label: "Язык",
  },
  home: {
    headline: {
      lead: "Экономьте ",
      em1: "деньги",
      mid: ", понимая свои ",
      em2: "данные",
      tail: ".",
    },
    cta: "Смотреть кейсы",
  },
  footer: {
    available: "Открыт для новых проектов",
  },
  services: {
    title: "Услуги",
    metaDescription:
      "BI-консалтинг, разработка дашбордов и дата-пайплайнов.",
    body: "Описание услуг скоро появится.",
  },
  contact: {
    title: "Контакты",
    metaDescription: "Напишите мне о вашем BI- или аналитическом проекте.",
    intro: "Отправьте деловое сообщение прямо мне на почту.",
    labelName: "Имя",
    labelEmail: "Почта",
    labelPhone: "Телефон",
  },
  form: {
    emailLabel: "Почта",
    emailPlaceholder: "ваш email для связи",
    subjectLabel: "Тема",
    subjectOptional: "(необязательно)",
    subjectPlaceholder: "о чём запрос",
    messageLabel: "Сообщение",
    messagePlaceholder:
      "Спросите о ставках, доступности или первичной оценке проекта.",
    submit: "Отправить",
    sending: "Отправка…",
    invalidEmail: "Введите корректный адрес почты",
    messageTooShort: "Напишите хотя бы 10 символов",
    messageTooLong: "Сообщение слишком длинное",
    success:
      "Спасибо — ваше сообщение отправлено. Я скоро вам отвечу.",
    errorFields: "Пожалуйста, исправьте отмеченные поля.",
    errorRateLimit:
      "Слишком много сообщений за короткое время. Попробуйте позже.",
    errorNotConfigured:
      "Форма обратной связи ещё не полностью настроена. Напишите мне напрямую на",
    errorSendFailed:
      "Извините — отправить не удалось. Напишите мне напрямую на",
  },
  sendDialog: {
    open: "Написать",
    title: "Отправить сообщение",
    subtitle: "Прямо мне в почту — я скоро отвечу.",
    close: "Закрыть",
    ariaLabel: "Отправить сообщение",
  },
  blog: {
    title: "Блог",
    metaTitle: "Блог",
    metaDescription: "Заметки о BI, аналитике и дата-инженерии.",
    empty: "Статьи скоро появятся.",
    searchPlaceholder: "Поиск по ключевым словам…",
    searchAria: "Поиск по статьям блога",
    newestFirst: "Сначала новые",
    oldestFirst: "Сначала старые",
    noMatch: "Ничего не найдено по запросу",
    backToBlog: "Назад в блог",
    older: "Раньше",
    newer: "Позже",
  },
  work: {
    title: "Портфолио",
    metaDescription:
      "Клиентские дашборды в виде кейсов — с историей проекта и живым отчётом Power BI или Apache Superset, который можно изучить.",
    intro: {
      lead: "Реальные клиентские дашборды в виде коротких кейсов. Откройте любой — там история проекта и живой отчёт: фильтруйте и проваливайтесь в детали ровно так, как это делает клиент. Сделано в ",
      powerbi: "Power BI",
      and: " и ",
      superset: "Apache Superset",
      tail: ".",
    },
    empty: "Кейсы скоро появятся.",
    backToShowcase: "Назад в портфолио",
    openLiveDashboard: "Открыть живой дашборд",
    readWriteUp: "Читать полный разбор в блоге",
    openLiveReport: "Открыть живой отчёт",
  },
  notFound: {
    code: "404",
    title: "Страница не найдена",
    body: "Страница, которую вы ищете, не существует или была перемещена.",
    back: "На главную",
  },
};
