# Russian-specific notes

Russian LLM output carries its own fingerprints on top of the English ones. Most come from direct calques of English corporate and academic prose, from канцелярит the model learned in official-document corpora, and from typography that is "correct" in a way no one typing in Telegram produces. Sources: Sharov, Utov (humanizer-ru, 44-58 markers), Denisov (humanizer-ru v3.16 evaluated on 35,158 Russian academic abstracts).

## Priority A: fix these first

**«Не просто X, а Y» / «не только X, но и Y»**
In 80%+ of GPT Russian output. Same straw-man mechanism as English.
- «Это не просто CRM, это новая философия взаимодействия с клиентом» → «Это CRM с нормальной историей переписки»
- «Не просто инструмент, а партнёр» → say what it does
- «Не только ускоряет, но и трансформирует» → «Ускоряет раза в два»
- «Вопрос не в том, может ли ИИ заменить человека, вопрос в том, как...» → cut the whole sentence

**Канцелярит (nominalisation + passive)**
The main marker. Any word ending in -ание / -ение / -ация / -ость: check whether a verb does the job.
- «Было осуществлено внедрение системы» → «Внедрили систему»
- «Реализация проекта завершена» → «Проект закончен»
- «Внедрение системы позволяет обеспечить повышение эффективности» → «Система ускорила работу на треть»
- «осуществление», «реализация», «обеспечение», «является», «данный», «в рамках», «с целью» are the usual suspects

**Длинное тире (—) в каждом втором предложении**
Russian legitimately uses the dash more than English (subject-predicate, dialogue), so the signal is not "any dash" but a dash used for a dramatic pause where a comma or a full stop would do, and in chat text that otherwise has no typography. In a Telegram reply, a person types a hyphen or nothing. Note: in academic abstracts humans use the dash *more* than models (4.8% vs under 1%), so leave it alone in that register.

**Пустое космическое открытие**
«В современном динамично развивающемся мире искусственный интеллект играет всё более важную роль...» Delete the first paragraph. The text starts at paragraph two, or start with a fact: «GPT-4 вышел в марте 2023-го. Через полгода его использовали 92% компаний из Fortune 500.»

**Неодушевлённый субъект**
«Исследование подчёркивает», «анализ показывает», «статья отмечает», «данные свидетельствуют»: 4.4x human rate. Say who: «Авторы пишут», «Мы увидели», «По данным Pangram».

**Калькированные обороты**
- «играет ключевую роль» (5.7x) → «важен», or say what it does
- «комплексный подход» (3x) → say what the approach consists of
- «подчёркивает важность» (from *underscore*) → «важно, потому что...»
- «нюансированный подход» → «аккуратный», «с оговорками»
- «по своей сути», «в своей основе», «в конечном счёте» → cut
- «бесшовная интеграция», «холистический подход», «робастное решение» → «встроили без переписывания», «целиком», «не падает»
- «гобелен», «вплетено», «ландшафт», «экосистема», «погружение» (as metaphors) → cut or replace with the literal thing
- «трансформирует», «революционизирует», «переосмысляет» → «меняет», or say how

**Шаблонные переходы из чата**
«Рассмотрим подробнее», «Давайте разберёмся», «Начнём с основ», «А теперь посмотрим, что это значит на практике», «Итак,», «Подводя итог». Cut; the next sentence stands on its own.

## Priority B

- **Тройки**: «быстро, удобно и безопасно», «люди, процессы, технологии», «анализировать данные, находить закономерности, принимать решения». Two or four, or the real number.
- **Триада-отрицание**: «Нет денег. Нет опыта. Только любовь.» / «Мы не просто школа. Мы семья. Мы будущее.»
- **«Больше чем просто...»**, «гораздо больше, чем обычная автоматизация».
- **«От X до Y»** false ranges: «от оптимизации рутинных задач до принятия стратегических решений».
- **Синонимическая карусель**: компания / организация / предприятие / фирма for one entity. Repeat the noun.
- **Title Case В Русских Заголовках**. Russian capitalises only the first word. Any heading with every word capitalised was generated.
- **Анонимный авторитет**: «Исследования показывают», «Эксперты отмечают», «По мнению специалистов». Name them or cut.
- **Слишком бодрый тон**: exclamation marks about routine topics; «Готовы? Поехали!»; emoji as structure.

## Priority C

- Uniform sentence and paragraph length (same as English).
- Uniform information density: alternate a dense paragraph of numbers with a short aside.
- **Идеальная типография в мессенджере**: «ёлочки», неразрывные пробелы, правильные тире, пробелы по ГОСТу in a Telegram or Slack message. People typing on a phone produce "quotes" and hyphens. Match the channel: typographic quotes in an article on Habr are fine; in a chat reply they are a tell.
- **Водянистость**: if the text can be halved with no loss, halve it.
- **Избыточная вежливость**: «Спасибо за вопрос!», «Отличный вопрос!», «Надеюсь, это поможет!», «Буду рад помочь!»
- **«Является»**: fine in an academic abstract (humans use it 8%, models under 3%); a tell in a blog post or chat.
- **-тся / -ться**: a long casual text with zero such slips and zero typos, while making case-agreement errors in long chains («в рамках реализации проекта по внедрению системы управления...»), reads machine. Don't add fake typos; do shorten the chains.

## What inverts in Russian

- The dash rule is softer in articles (Russian punctuation needs it) and stays strict in chat.
- «Является» is register-dependent, not banned.
- Contractions don't exist; informality comes from word order, particles («ну», «вот», «же», «вообще-то»), and sentence fragments instead.
- Bureaucratic register in a legal or formal document is the genre norm; don't strip it there.

## Example rewrites

**Article opening**
До: «В современном мире мониторинг является неотъемлемой частью любой высоконагруженной системы. В данной статье мы рассмотрим ключевые аспекты внедрения системы мониторинга и подчеркнём важность комплексного подхода.»
После: «Прод лёг в пятницу в 23:10. Алертов не было, потому что алертов не было. Дальше про то, как мы ставили мониторинг и что сделали не так.»

**Chat reply**
До: «Отличный вопрос! Для решения данной проблемы существует несколько подходов. Во-первых, рекомендуется осуществить проверку конфигурации пула соединений. Во-вторых, стоит рассмотреть возможность использования PgBouncer. Надеюсь, это поможет!»
После: «Это опять pgbouncer. Поставь pool_mode=transaction на воркерах, idle-соединения должны упасть. Если нет, значит кроны держат сессии, завтра посмотрю.»

**Blog post**
До: «Удаление кэша стало для нашей команды не просто технической задачей, а настоящим переосмыслением подхода к архитектуре. Этот опыт подчёркивает важность регулярного пересмотра принятых решений.»
После: «Вчера я наконец выпилил Redis перед каталогом. Стоял с 2021-го, никто не помнил зачем. Hit rate 11%, запросы в постгрес 4 мс. Ничего не сломалось.»
