import type { Dictionary } from "./en";
import { AUTHOR_NAME } from "../person";

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
    about: "Обо мне",
    contact: "Контакты",
    message: "Написать",
    openMenu: "Открыть меню",
  },
  langSwitcher: {
    label: "Язык",
  },
  home: {
    // English placeholder: Russian is not published.
    h1: "Power BI and Microsoft Fabric consultant",
    headline: {
      lead: "Экономьте ",
      em1: "деньги",
      mid: ", понимая свои ",
      em2: "данные",
      tail: ".",
    },
    lede: "Полный цикл BI-решений на современном open-source и SaaS стеке: MS Fabric, Power BI, Apache Superset. От извлечения сырых данных до визуализации.",
    cta: "Кейсы",
    ctaSecondary: "Цены",
  },
  services: {
    title: "Услуги",
    heading:
      "Data & Fabric engineering, Power BI, n8n, AI agents and automation",
    // The hub's links to the service pages (SEO spec T-04); the list shows only pages out of draft.
    pagesTitle: "Services in detail",
    metaTitle: "Услуги по Power BI и цены",
    metaDescription:
      "Консалтинг по Power BI и Apache Superset — дашборды, модели данных, пайплайны. Подписка, проекты и срочные работы, с ценами.",
    subscription: {
      eyebrow: "Подписка",
      badge: "Помесячная оплата",
      tiers: [
        {
          name: "Small",
          desc: "Дашборды работают как часы, а вы о них не думаете. Около 40 часов в месяц на правки, доработки и быстрые ответы — просто спросите.",
          price: "$1,500",
          unit: "в месяц · ~40 ч",
        },
        {
          name: "Medium",
          desc: "Как свой data-специалист в команде, только без найма. Около 60 часов в месяц на новые отчёты, правки модели и растущий список хотелок.",
          price: "$2,200",
          unit: "в месяц · ~60 ч",
        },
        {
          name: "Large",
          desc: "Отдайте мне весь стек отчётности. Около 80 часов в месяц — от пайплайнов до последнего графика: вы задаёте приоритеты, я довожу до результата.",
          price: "$3,000",
          unit: "в месяц · ~80 ч",
        },
      ],
      servicesTitle: "В каждую подписку входит",
      services: [
        "Дашборды на Power BI и Superset",
        "Моделирование данных и DAX",
        "Разработка на SQL и PostgreSQL",
        "ETL / ELT-пайплайны",
        "Модели и тесты на dbt",
        "Мониторинг качества данных",
        "Проектирование хранилища и архитектуры",
        "Проектирование семантического слоя",
        "Автоматизация обновлений",
        "Оптимизация производительности",
        "Row-level security и доступы",
        "Определение KPI и метрик",
        "Аудит и код-ревью",
        "Документация и передача дел",
        "Приоритетная поддержка",
      ],
    },
    project: {
      eyebrow: "Проект",
      badge: "Фиксированный объём",
      tiers: [
        {
          name: "Короткий",
          desc: "Тот самый дашборд, который всё откладывается? Давайте вместе определим объём и сделаем его как следует — от начала до конца.",
          price: "$2k–5k",
          unit: "за проект",
        },
        {
          name: "Средний",
          desc: "Чистая модель данных и набор дашбордов, которые команда действительно открывает каждое утро. Расскажите, что вам нужно видеть.",
          price: "$5k–12k",
          unit: "за проект",
        },
        {
          name: "Длинный",
          desc: "От сырых данных до отчётной платформы, которая растёт вместе с вами. Большой проект с понятными этапами и без сюрпризов.",
          price: "$10k–25k",
          unit: "за проект",
        },
      ],
    },
    other: {
      eyebrow: "Другое",
      tiers: [
        {
          name: "Срочно",
          desc: "Отчёт сломался, обновление зависло, а совет директоров в пятницу? Пишите, помогу очень быстро.",
          price: "$300+",
          unit: "разово",
        },
        {
          name: "Первичная консультация",
          desc: "Нужен экспертный взгляд на ваш стек или код, или просто хотите разобраться? Консультации по BI и AI понятным языком.",
          price: "Бесплатно",
          unit: "",
        },
      ],
    },
    // Заглушка условий для попапа на карточке — реальный текст будет позже.
    conditions: {
      aria: "Посмотреть условия",
      title: "Условия",
      close: "Закрыть",
      body: [
        "Заглушка условий — здесь появятся реальные условия по формату работы. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        "Объём, график оплаты, правки и условия отмены будут перечислены короткими понятными пунктами.",
        "Пока это лишь черновой текст-заполнитель — до предоставления финальных условий.",
      ],
    },
  },
  // English placeholder: Russian is not published.
  privacy: {
    title: "Privacy",
    metaDescription:
      "What vosk.dev collects and why: analytics only after you accept the cookie card, contact form messages sent by email, questions asked in the AI chats.",
    lede: "What this site collects, and what it doesn't.",
    updated: "Updated 19 November 2026",
    sections: [
      {
        title: "Analytics",
        body: [
          "Google Analytics, through Google Tag Manager, loads only after you press Accept on the cookie card. It counts page views and clicks on the main buttons, such as Message, a report or the contact form, and shows whether a visit came from a Google ad.",
          "Press Decline and nothing loads. Your choice is kept in your own browser (localStorage, key vosk.consent), not on my server.",
        ],
      },
      {
        title: "Contact form",
        body: [
          "The form sends your email address, the subject and the message to my mailbox through Resend, an email service, and sends you a copy. The site keeps no database of messages.",
          "With the message the form also sends the page you first opened on this site and, if the link you came by had campaign tags (for example from an ad), those tags. They are kept in your browser tab until it closes, without a cookie, and go nowhere else.",
        ],
      },
      {
        title: "AI chats",
        body: [
          "Questions typed into a report's Ask AI chat go to an AI model provider to get the answer. For each question the site logs its size, cost and a scrambled, shortened form of your IP address, never the text.",
          "The Tidewell data chat emails a report only to an address you type and confirm yourself. My n8n automation server sends it.",
        ],
      },
      {
        title: "Reports and previews",
        body: [
          "Some reports load from outside services, such as Microsoft Power BI, and workflow previews load from n8n, only when you click to open them. Those services follow their own privacy policies.",
        ],
      },
      {
        title: "Hosting",
        body: [
          "The site runs on Vercel, which keeps short-lived technical logs to run and protect the service.",
        ],
      },
    ],
    contactTitle: "Questions",
    contactBody:
      "To ask what I hold about you, or to have it deleted, write to",
    changeChoice: "Change cookie choice",
  },
  // English placeholder: Russian is not published (SEO spec, section 1).
  about: {
    title: "About",
    metaTitle: `About ${AUTHOR_NAME}: Power BI & Fabric Consultant (DP-600)`,
    metaDescription: `${AUTHOR_NAME}, Power BI and Microsoft Fabric consultant with the DP-600 certificate. Based in Turkey, working remotely.`,
    lede: "Power BI and Microsoft Fabric consultant.",
    body: [
      "I build Power BI and Fabric reports, the data models and SQL under them, and the pipelines that keep them fresh. Around them: n8n automations for reports, inboxes and invoices, and AI chats that answer questions straight from your data.",
      "I'm based in Turkey and work remotely.",
    ],
    stackTitle: "What I work with",
    stack: [
      "Microsoft Fabric",
      "Power BI",
      "MS SQL",
      "PostgreSQL",
      "dbt",
      "n8n",
      "AI-агенты",
      "Онтологии",
      "Семантические слои",
      "ETL",
      "ELT",
    ],
    credentialTitle: "Certificate",
    credential:
      "Microsoft Certified: Fabric Analytics Engineer Associate (DP-600)",
    linkCertificate: "see certificate",
    contactsTitle: "Contacts",
    labelName: "Имя",
    labelEmail: "Почта",
    labelLinkedin: "LinkedIn",
    labelUpwork: "Upwork",
    labelGithub: "GitHub",
    labelDp600: "DP-600",
    linkProfile: "смотреть профиль",
    linkPending: "Скоро",
  },
  // English placeholder: Russian is not published.
  serviceDetail: {
    audienceTitle: "Who it's for",
    deliverablesTitle: "What you get",
    pricingTitle: "Price",
    casesTitle: "Case studies",
    stepsTitle: "How it runs",
    faqTitle: "Questions",
    postsTitle: "Further reading",
    ctaTitle: "Got a project like this?",
    ctaBody:
      "Tell me what the report should answer and where the data lives, and I'll tell you what it would take.",
    ctaContact: "Get in touch",
  },
  contact: {
    title: "Контакты",
    metaTitle: "Связаться с BI-аналитиком",
    metaDescription:
      "Напишите о проекте на Power BI, Superset или аналитике — через форму или почту. BI-аналитик на фрилансе, работаю с клиентами по всему миру.",
    intro: "Отправьте деловое сообщение прямо мне на почту.",
    bookCall: "Book a 20-minute call",
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
    success: "Спасибо — ваше сообщение отправлено. Я скоро вам отвечу.",
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
    metaTitle: "Блог — заметки о Power BI, DAX и SQL",
    metaDescription:
      "Практические заметки о Power BI, DAX, SQL и моделировании данных от BI-аналитика на фрилансе — рабочие приёмы из клиентских проектов, а не туториалы.",
    intro:
      "Рабочие заметки из клиентских проектов: приёмы Power BI и DAX, рабочие процессы SQL и Postgres и вся обвязка вокруг доставки данных.",
    tagMetaDescription:
      "Все статьи с тегом {tag} — практические заметки о BI, дашбордах, моделях данных и инструментах вокруг них, от BI-аналитика на фрилансе.",
    tagIntro: "Все статьи с тегом {tag}, сначала новые.",
    breadcrumbHome: "Главная",
    related: "Похожие статьи",
    ctaTitle: "Нужно то же самое для вашей команды?",
    ctaBody:
      "Я занимаюсь этим профессионально — дашборды Power BI и Superset, модели данных под ними и пайплайны, которые держат их актуальными.",
    ctaServices: "Услуги и цены",
    ctaContact: "Связаться",
    empty: "Статьи скоро появятся.",
    searchPlaceholder: "Поиск по ключевым словам…",
    searchAria: "Поиск по статьям блога",
    newestFirst: "Сначала новые",
    oldestFirst: "Сначала старые",
    noMatch: "Ничего не найдено по запросу",
    tagged: "По тегу",
    backToBlog: "Назад в блог",
    older: "Раньше",
    newer: "Позже",
    updated: "Обновлено",
    paginationAria: "Страницы блога",
  },
  work: {
    title: "Портфолио",
    metaTitle: "Кейсы BI-дашбордов",
    breadcrumbHome: "Главная",
    aboutHeading: "О проекте",
    clientLabel: "Клиент",
    metaDescription:
      "Примеры работ, которые можно открыть вживую: дашборды Power BI и Fabric, автоматизации n8n, ИИ-агенты и чаты, инженерия данных, семантические слои и онтологии.",
    intro: {
      lead: "Мои примеры работ и живые интерактивные демо: ",
      topics: [
        "дашборды и отчёты Power BI / Fabric",
        "автоматизации n8n",
        "ИИ-агенты и чаты",
        "решения по инженерии данных",
        "семантические слои",
        "онтологии",
      ],
    },
    empty: "Кейсы скоро появятся.",
    backToShowcase: "Назад в портфолио",
    closeReport: "Закрыть отчёт",
    openPowerBi: "Power BI",
    openWebReport: "Веб-отчёт",
    askAi: "Спросить ИИ",
    chatAppSlot: "Здесь ваше ПРИЛОЖЕНИЕ или BI-ОТЧЁТ",
    writeUp: "Разбор",
    dashboardLoading: "Загружаем живой дашборд…",
    dashboardError:
      "Не удалось загрузить дашборд. Попробуйте обновить страницу.",
    openWorkflow: "Открыть флоу n8n",
    howToTestHeading: "Попробуйте сами",
    samplesLabel: "Образцы счетов",
    sampleName: "Счёт №{n}",
    workflowLoading: "Загружаем воркфлоу…",
    workflowError:
      "Не удалось загрузить схему воркфлоу. Попробуйте через минуту.",
    paginationAria: "Страницы портфолио",
    dataLabel: {
      synthetic: "Демо на синтетических данных",
      client: "Реальные операционные цифры, названия изменены",
      anonymised: "Отчёт клиента, анонимизированные данные",
    },
    nextCta: "Нужно такое для ваших данных? Напишите мне.",
    nextCtaBooking: "Запишитесь на бесплатный звонок или напишите мне.",
    nextBook: "Бесплатный звонок",
    nextContact: "Написать",
    nextServices: "Цены",
    relatedTitle: "Другие кейсы",
  },
  salesDashboard: {
    filtersAria: "Фильтры дашборда",
    yearLabel: "Год",
    allYears: "Все",
    revenue: "Выручка",
    profit: "Прибыль",
    orders: "Заказы",
    margin: "Маржа",
    vsPrior: "Изменение к {period}",
    noPriorYear: "Нет прошлого года для сравнения",
    monthlyTitle: "Выручка, прибыль и заказы по месяцам",
    topTitle: "Топ-5",
    topKindAria: "Разрез",
    byCategory: "Категория",
    byCountry: "Страна",
    metricAria: "Показатель",
    channelsTitle: "Продажи по каналам",
    viewAria: "Вид",
    viewTable: "Таблица",
    viewChart: "График",
    colChannel: "Канал",
    total: "Итого",
    footnote:
      "Только завершённые заказы. Прибыль — выручка минус себестоимость товаров. Синтетические данные, запрошенные через семантический слой Cube.",
  },
  notFound: {
    code: "404",
    title: "Страница не найдена",
    body: "Страница, которую вы ищете, не существует или была перемещена.",
    back: "На главную",
  },
};
