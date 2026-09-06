# Освежение аудиоплеера и направления развития

Дата исследования: 2026-09-06. Методология: все фактические утверждения о технологиях, API и поддержке браузеров проверены по первоисточникам (MDN Web Docs, W3C/WHATWG-спецификации, официальная документация инструментов, репозитории OSS) и снабжены ссылками. Оценки трудоёмкости и рисков в разделах 3-5 - экспертные оценки для этого проекта, а не цитаты. Версии инструментов зафиксированы на дату исследования.

## 1. Текущее состояние проекта

Факты из репозитория (проверено по коду):

- Ванильный JavaScript без фреймворков: классы `AudioPlayer`, `Playlist`, `Track`, `Equalizer`, `Analyser` в `src/scripts/`, UI на чистом DOM, стили - SCSS (`src/styles/main.scss` с хелперами `_mixins.scss`, `_variables.scss`), иконки - SVG в разметке.
- Аудио-граф Web Audio API: `AudioBufferSourceNode`/`MediaElementAudioSourceNode` -> 10 полос эквалайзера на `BiquadFilterNode` (peaking, 60..16000 Гц, усиление -12..+12 дБ, ~19 пресетов) -> `GainNode` (громкость/mute) -> `AnalyserNode` (`fftSize` 2048) -> `destination`.
- Визуализатор на Canvas 2D по данным `getFloatFrequencyData`/`getByteFrequencyData`/`getByteTimeDomainData`; собственный `EventEmitter`; соглашение о "приватности" через имена с подчёркиванием (`_createAudioApiNodes` и т.п.).
- Сборка 2016-2017 годов (`package.json`): gulp 3.9.1, gulp-browserify + babelify + babel-preset-es2015 (Babel 6), gulp-sass 3.1 (эпоха node-sass/libsass), ESLint 3.19 + airbnb-конфиг 15, browser-sync как dev-сервер.

Почему стек больше не работает и не поддерживается:

- `node-sass` официально достиг конца жизни: "Node Sass has reached end of life. It will receive no more releases, even for security fixes. Projects that still use it should move onto Dart Sass" (https://github.com/sass/node-sass, https://sass-lang.com/blog/node-sass-is-end-of-life). Таблица поддержки node-sass показывает жёсткую привязку версий к версиям Node (для Node 20 нужна версия 9.0+, для Node 18 - 8.0+; https://github.com/sass/node-sass), поэтому старые сборочные зависимости эпохи Node 4-6 на актуальных Node не устанавливаются.
- `babel-preset-es2015` и прочие годовые пресеты официально устарели: "As of Babel v6, all the yearly presets have been deprecated. We recommend using @babel/preset-env instead" (https://babeljs.io/docs/babel-preset-es2015).
- Актуальный gulp - 5.0.1 (https://www.npmjs.com/package/gulp); ветка 3.x не обслуживалась много лет. ESLint 3.x несовместим с современными конфигурациями: актуальная версия - 10.10.0 (https://www.npmjs.com/package/eslint).
- Актуальные LTS-линейки Node.js: 22.x (Maintenance LTS до 2027-04-30), 24.x (Active LTS до 2028-04-30), 26.x (Current) (https://github.com/nodejs/release).

## 2. План освежения

Цель: минимальными изменениями кода перевести проект на поддерживаемый стек 2026 года, не переписывая логику аудио-графа, которая сама по себе актуальна.

### 2.1 Замена инструментария

| Было | Стало | Обоснование (первоисточники) |
| --- | --- | --- |
| gulp 3.9 + gulp-watch + browser-sync | Vite 8 (dev-сервер + сборка) | Vite - dev-сервер поверх нативных ES-модулей с HMR и сборка в одном инструменте (https://vite.dev/guide/). Актуальная версия 8.2.2 (https://www.npmjs.com/package/vite); Vite 8.0 вышел 2026-03-12 и собирает через Rolldown (https://vite.dev/blog/announcing-vite8). Требования: Node 20.19+/22.12+ (https://vite.dev/guide/). `index.html` становится точкой входа; `<script type="module">` подключается напрямую (https://vite.dev/guide/) |
| gulp-browserify + babelify + babel-preset-es2015 | нативный ESM без транспиляции | Vite в разработке отдаёт модули как есть (native ES modules, https://vite.dev/guide/); для продакшена целится в Baseline Widely Available браузеры (https://vite.dev/guide/). Babel не нужен: годовые пресеты устарели (https://babeljs.io/docs/babel-preset-es2015) |
| gulp-sass 3 (node-sass) | `sass-embedded` или `sass` (Dart Sass) | node-sass - конец жизни (https://sass-lang.com/blog/node-sass-is-end-of-life). Официальные npm-пакеты Sass: `sass` (чистый JS) и `sass-embedded` (быстрее, обёртка над Dart VM) (https://sass-lang.com/install/). Актуальный Dart Sass - 1.104.0 (https://sass-lang.com/install/). Vite поддерживает `.scss` из коробки: достаточно установить препроцессор (`npm add -D sass-embedded # or sass`) (https://vite.dev/guide/features, раздел CSS Pre-processors) |
| ESLint 3 + airbnb + eslintrc | ESLint 10.x + flat config `eslint.config.js` | Актуальная версия 10.10.0 (https://www.npmjs.com/package/eslint). Flat config - формат по умолчанию начиная с ESLint v9.0.0 (https://eslint.org/docs/latest/use/configure/migration-guide); конфигурация задаётся файлом `eslint.config.js` (https://eslint.org/docs/latest/use/configure/configuration-files). Для конвертации старого `.eslintrc` есть официальный мигратор `@eslint/migrate-config` (https://eslint.org/docs/latest/use/configure/migration-guide) |
| тестов нет | Vitest (юнит) + Playwright (e2e) | Vitest 5.0.0 - тест-раннер поверх Vite, читает `vite.config.*` (https://vitest.dev/guide/, https://www.npmjs.com/package/vitest; требует Vite >=6.4.0 и Node >=22.12.0). Playwright - e2e-фреймворк с Chromium/Firefox/WebKit (https://playwright.dev/docs/intro) |
| - | Vite из коробки обрабатывает TS, JSX, CSS-модули, воркеры, ассеты | https://vite.dev/guide/features (включая раздел TypeScript: Vite транспилирует `.ts`, но не проверяет типы - этим занимается `tsc --noEmit`) |

### 2.2 Модернизация кода Web Audio

Актуальная спецификация - Web Audio API 1.1 (W3C Working Draft от 2024-11-05, https://www.w3.org/TR/webaudio/). Базовые узлы, которые использует проект (`BiquadFilterNode`, `GainNode`, `AnalyserNode`, источники), остаются ядром API и никуда не делись (https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode, https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode).

Обязательные правки:

1. **Политика автозапуска (autoplay policy).** Web Audio подчиняется правилам автозапуска с Chrome 71: `AudioContext`, созданный без жеста пользователя, стартует в состоянии `suspended`, и нужно вызвать `resume()` после взаимодействия (или создавать контекст по клику; проверять `AudioContext.state` и событие `statechange`) (https://developer.chrome.com/blog/autoplay). Общее правило MDN: воспроизведение со звуком разрешено только после взаимодействия пользователя с сайтом (https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay). Для плеера это значит: не автоплей на загрузке страницы, явная кнопка Play, обработка отказа `play()`/`start()` (https://developer.chrome.com/blog/autoplay).
2. **Учёт особенности `MediaElementAudioSourceNode`.** После `createMediaElementSource()` звук элемента перенаправляется в граф `AudioContext` и наружу идёт только через граф (https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource). Это уже так в проекте, но это важно зафиксировать как инвариант: отключение/ошибки графа = тишина.
3. **Сглаживание визуализатора.** `AnalyserNode.smoothingTimeConstant` - усреднение с предыдущим кадром анализа, "makes the transition between values over time smoother" (https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode). Если в проекте сглаживание делается вручную на Canvas-уровне, его можно перенести на `AnalyserNode`.
4. **Приватность классов.** Заменить соглашение `_underscore` на настоящие приватные элементы `#field`: инкапсуляция принудительно обеспечивается самим языком, обращение извне класса - синтаксическая ошибка (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements). TypeScript поддерживает ECMAScript-приватные поля начиная с 3.8 (https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html).
5. **Если появится кастомная DSP - только `AudioWorklet`, не `ScriptProcessorNode`.** `ScriptProcessorNode` заменён AudioWorklet'ами: "This feature was replaced by AudioWorklets and the AudioWorkletNode interface" (https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode). `AudioWorklet` выполняет обработку в отдельном аудио-потоке с низкой задержкой (https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet). В текущем проекте ScriptProcessorNode не используется, поэтому это требование на будущее.

### 2.3 Рекомендуемый порядок работ

1. Этап 0: зафиксировать текущее поведение e2e-тестом Playwright (smoke: страница открывается, трек запускается по кнопке) - чтобы миграцию проверять поведением, а не "на глаз" (подход по https://playwright.dev/docs/intro).
2. Этап 1: перенос на Vite 8 + `sass-embedded`, отказ от gulp/browserify/babel; нативный ESM; скрипты `dev`/`build`/`preview` (https://vite.dev/guide/).
3. Этап 2: ESLint 10 + flat config через `@eslint/migrate-config` (https://eslint.org/docs/latest/use/configure/migration-guide), чистка устаревших правил airbnb-конфига.
4. Этап 3: правка автозапуска (`resume()` по жесту, `state`/`statechange`) (https://developer.chrome.com/blog/autoplay); `#`-приватные поля.
5. Этап 4: Vitest для логики плейлиста/эквалайзера (чистые модули), Playwright - для UI; подходы к тестированию Web Audio - см. раздел 3.7.
6. Этап 5 (опционально): TypeScript по официальному сценарию постепенной миграции (https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html).

## 3. Направления развития

### 3.1. Media Session API: управление с клавиатуры, наушников, экрана блокировки

- **Что даёт пользователю.** Обложка, название, исполнитель и кнопки play/pause/next/prev в системных медиа-контролях ОС, на экране блокировки и на гарнитуре, без открытия вкладки плеера (https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API).
- **Ключевые API.** `navigator.mediaSession`, `MediaMetadata` (title/artist/album/artwork), `setActionHandler()` для play/pause/stop/seekto/previoustrack/nexttrack, `playbackState` (https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API). Спецификация - W3C Media Session Standard (https://w3c.github.io/mediasession/).
- **Поддержка.** Chrome 73 / Chrome Android 57 / Firefox 82 (в Firefox на Android API доступен, но без системного UI) / Safari 15+ включая iOS - по данным MDN Browser Compatibility Data (https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/MediaSession.json). Библиотека поверх `setActionHandler` не нужна - API небольшое.
- **Как.** Обновлять `mediaSession.metadata` при смене трека; повесить обработчики на транспорт плеера; тестировать на реальном устройстве. Практическое руководство: "Customize media notifications and playback controls with the Media Session API" (https://web.dev/articles/media-session).
- **Трудоёмкость/риски.** Очень низкая (1-2 дня); рисков почти нет, API стабильное (не экспериментальное - https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/MediaSession.json). Артворк нужно откуда-то брать (для локальных файлов - из тегов, см. 3.2).
- **OSS-примеры.** airsonic-refix (веб-клиент Subsonic-совместимых серверов) прямо заявляет "MediaSession integration" в фичах (https://github.com/tamland/airsonic-refix).

### 3.2. Локальная библиотека: выбор папки, drag-and-drop, чтение тегов

- **Что даёт пользователю.** Полноценная библиотека из собственных файлов без загрузки на сервер: открыть папку с музыкой или перетащить файлы в окно, увидеть названия, исполнителей, обложки из ID3/Vorbis-тегов.
- **Ключевые API.** File System Access API: `window.showOpenFilePicker()` / `showDirectoryPicker()` возвращают персистентные хэндлы `FileSystemFileHandle`/`FileSystemDirectoryHandle`; хэндлы можно сериализовать в IndexedDB и переиспользовать между сессиями; `DataTransferItem.getAsFileSystemHandle()` даёт хэндлы для перетащенных файлов (https://developer.mozilla.org/en-US/docs/Web/API/File_System_API). Универсальный fallback - `<input type="file" multiple webkitdirectory>` и обычный drag-and-drop с `DataTransfer` (базовый HTML Drag and Drop API, https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API).
- **Поддержка.** Пикеры File System Access доступны в Chromium-браузерах (Chrome/Edge 86+); в Firefox и Safari не поддерживаются; Brave - за флагом (https://developer.chrome.com/docs/capabilities/web-apis/file-system-access). Базовые `FileSystemHandle`-объекты (в т.ч. OPFS) шире: Firefox 111, Safari 15.2 (https://web.dev/learn/pwa/offline-data). Значит: основной путь - Chromium, для остальных - `<input>`/drag-and-drop fallback.
- **Чтение тегов - две библиотеки.**
  - `jsmediatags`: читает ID3v1, ID3v2 (с unsynchronisation), MP4, FLAC; умеет читать из Blob/File напрямую (https://github.com/aadsm/jsmediatags). Текущая активность сопровождения проекта не проверялась (не проверено).
  - `music-metadata` (TypeScript, активно развивается): ID3v1/v2.2-2.4, APE, Vorbis comments, iTunes/MP4, RIFF/INFO, EXIF; формат+битрейт+длительность; браузерные функции `parseBlob()`/`parseWebStream()`; работает в Node >= 18 и в браузере с бандлером (https://github.com/Borewit/music-metadata). Webamp указан среди онлайн-демо этого парсера (https://github.com/Borewit/music-metadata).
  - Рекомендация: `music-metadata` как основной (форматы, типы, стриминг), `jsmediatags` - только если нужен минимальный вес бандла.
- **Трудоёмкость/риски.** Средняя (1-2 недели на библиотеку с индексом). Риски: кросс-браузерность файлового доступа (решается fallback'ом), объём обложек в IndexedDB (квоты - см. 3.3).
- **OSS-примеры.** Webamp - Winamp 2 в браузере (TypeScript, 11k+ звёзд), используется Internet Archive для прослушивания аудио (https://github.com/captbaritone/webamp).

### 3.3. PWA: установка, офлайн-воспроизведение, хранение библиотеки

- **Что даёт пользователю.** Плеер устанавливается как приложение, работает без сети (app shell закэширован, ранее прослушанные треки доступны офлайн), плейлисты и обложки переживают перезапуск.
- **Ключевые API и факты.** Cache Storage - для сетевых ресурсов (HTML/CSS/JS/аудио), IndexedDB - для структурированных данных (плейлисты, метаданные); оба доступны из main thread, воркеров и service worker'а (https://web.dev/learn/pwa/offline-data). Квоты: Chrome позволяет браузеру использовать до 80% диска, один origin - до 60% (https://web.dev/learn/pwa/offline-data). `navigator.storage.persist()` защищает данные от автоочистки (https://web.dev/learn/pwa/offline-data). Обзор PWA-подхода в целом: https://web.dev/learn/pwa/.
- **Как в стеке Vite.** `vite-plugin-pwa` - официальный плагин-интеграция: zero-config service worker на Workbox, авто-инъекция манифеста, offline-ready из коробки (https://vite-pwa-org.netlify.app/).
- **Трудоёмкость/риски.** Низкая-средняя для app shell (2-4 дня); кэширование аудио сложнее - нужны стратегии (что кэшировать: только текущий плейлист), контроль квот (https://web.dev/learn/pwa/offline-data).
- **OSS-примеры.** airsonic-refix поставляет `manifest.webmanifest` и рассчитан на работу в браузере как приложение (репозиторий: https://github.com/tamland/airsonic-refix).

### 3.4. Интеграция с самохостинг-стриминг-сервером: Subsonic/Navidrome или Jellyfin

- **Что даёт пользователю.** Доступ к своей фонотеке с любого устройства: сервер хранит и транскодирует, плеер - тонкий клиент. Плейлисты, избранное, scrobbling.
- **Вариант A: Subsonic-совместимые (Navidrome, Airsonic-Advanced, gonic).**
  - Протокол Subsonic API: REST-методы, ответ в XML или JSON (`f=json`), аутентификация токеном `t = md5(password + salt)` + соль `s`, версии до 1.16.1 (http://www.subsonic.org/pages/api.jsp). Полный набор: `ping`, `getArtists`, `getAlbumList2`, `search3`, `getPlaylists`, `stream`, `getCoverArt`, `scrobble`, и даже `hls` (http://www.subsonic.org/pages/api.jsp).
  - Navidrome - самохостинг-сервер музыки, совместим с Subsonic API v1.16.1 (с оговорками) и активно добавляет расширения OpenSubsonic (https://www.navidrome.org/docs/developers/subsonic-api/, https://opensubsonic.netlify.app/).
  - OSS-клиенты, доказывающие реализуемость: Jamstash - HTML5-стример для Subsonic (AngularJS, классика жанра; https://github.com/tsquillario/Jamstash); airsonic-refix - современный веб-фронтенд на Vue для airsonic-advanced/navidrome/gonic: библиотека, плейлисты, поиск, радио, подкасты, очередь (https://github.com/tamland/airsonic-refix).
  - Заметное преимущество: один клиент сразу работает со всеми серверами экосистемы (Navidrome имеет десятки Subsonic-приложений; https://www.navidrome.org/docs/developers/subsonic-api/).
- **Вариант B: Jellyfin.** Бесплатная медиа-система с полным REST API и официальным веб-клиентом (https://jellyfin.org/docs/, https://github.com/jellyfin/jellyfin-web). Для клиентской разработки есть официальный TypeScript SDK `@jellyfin/sdk` (https://typescript-sdk.jellyfin.org/). API шире музыкального (видео, TV), протокол несовместим с Subsonic.
- **Как.** Слой "источники треков" в плеере (интерфейс: список треков + стрим URL + обложка); реализация Subsonic-клиента (JSON, token-auth, `stream` подаётся в существующий `<audio>`/MediaElementSource); Media Session поверх (3.1).
- **Трудоёмкость/риски.** Высокая (3-6 недель до зрелого клиента): аутентификация, транскодинг-параметры, синхронизация плейлистов/избранного, офлайн-кэш. Риски: CORS на самохостинг-сервере (нужно правильно настроить reverse proxy), различия реализаций API между серверами (Navidrome документирует отличия: https://www.navidrome.org/docs/developers/subsonic-api/).
- **Рекомендация внутри направления:** начать с Subsonic/Navidrome как стандарта де-факто для музыки; Jellyfin - отдельным модулем позже.

### 3.5. HLS-стриминг через hls.js

- **Что даёт пользователю.** Воспроизведение живых радиопотоков и длинных VOD-записей в формате HTTP Live Streaming (адаптивный битрейт, сегменты), а также интеграция с серверами, которые отдают HLS (Subsonic API даже имеет отдельный метод `hls`; http://www.subsonic.org/pages/api.jsp).
- **Ключевые библиотеки/факты.** hls.js - JS-реализация HLS-клиента поверх HTML5 video и Media Source Extensions; трансмуксирует MPEG-2 TS и AAC/MP3 в фрагменты MP4 в Web Worker (https://github.com/video-dev/hls.js). Прямо заявлена поддержка audio-only потоков: "AAC container (audio only streams)", "MPEG Audio container (MPEG-1/2 Audio Layer III audio only streams)" (https://github.com/video-dev/hls.js). Также поддерживает live/DVR, low-latency HLS, альтернативные аудиодорожки (https://github.com/video-dev/hls.js).
- **Как.** `Hls.isSupported()` -> `attachMedia` на том же `<audio>` элементе, который уже подключён к Web Audio графу через `createMediaElementSource()` (https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource) - эквалайзер и визуализатор продолжат работать, т.к. hls.js пишет в media element (https://github.com/video-dev/hls.js).
- **Трудоёмкость/риски.** Низкая-средняя (2-4 дня на интеграцию radio/HLS-источников). Риски: поддержка MSE на конкретных платформах не проверялась (не проверено); CORS у потоков.
- **OSS-пример.** Subsonic API включает HLS-эндпоинт, т.е. это штатный сценарий серверов экосистемы (http://www.subsonic.org/pages/api.jsp).

### 3.6. Десктоп-упаковка: Tauri vs Electron

- **Что даёт пользователю.** Нативное приложение macOS/Windows/Linux: иконка в доке, автозапуск, системные хоткеи, доступ к локальным файлам без ограничений браузера.
- **Tauri (рекомендуемый по умолчанию).** Фреймворк для "tiny, fast binaries" на всех основных десктопных и мобильных платформах; фронтенд - любой HTML/JS/CSS (в т.ч. этот проект), бэкенд - Rust при необходимости. Ключевые свойства: использует системный webview (не бандлит браузер), минимальное приложение меньше 600KB, безопасность на базе Rust + внешние аудиты релизов (https://v2.tauri.app/start/).
- **Electron.** Каждое приложение поставляется бандлом "Electron, Chromium shared library and Node.js" (https://www.electronjs.org/docs/latest/tutorial/security), отсюда большие размеры и жёсткие требования security-чеклиста (contextIsolation, sandbox, CSP, nodeIntegration выключен для удалённого контента; https://www.electronjs.org/docs/latest/tutorial/security). Плюс: одинаковый движок во всех ОС и доступ к Node API.
- **Компромиссы.** Tauri: системный webview означает разные движки (WKWebView/WebView2/WebKitGTK) - нужно тестировать Web Audio/Canvas в каждом; Rust-тулчейн для нативной части. Electron: крупнее дистрибутив и память, но предсказуемее среда (https://v2.tauri.app/start/, https://www.electronjs.org/docs/latest/tutorial/security).
- **Трудоёмкость/риски.** Низкая на старт (2-4 дня на обёртку), средняя на полировку (автообновления, подпись сборок). Риски Tauri: аудио-граф в WKWebView/WebKitGTK должен пройти ручную проверку (не проверено).
- **OSS-пример.** Webamp Desktop - Electron-версия Webamp (https://github.com/captbaritone/webamp, раздел "In the Wild").

### 3.7. Инженерное качество: TypeScript, приватные поля, тестирование Web Audio

- **Что даёт пользователю.** Косвенно: меньше регрессий в аудио-графе и плейлисте, быстрее добавление новых источников.
- **TypeScript-миграция.** Официальный гайд: разрешить `allowJs`, переименовывать файлы по одному, наращивать строгость (`noImplicitAny` и др.), типы для DOM/Web Audio идут из lib.dom (https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html). Vite транспилирует `.ts` из коробки; проверку типов делать отдельным `tsc --noEmit` (https://vite.dev/guide/features, раздел TypeScript).
- **Приватные элементы `#`.** Естественная замена `_underscore`: "privacy encapsulation... enforced by JavaScript itself", обращение извне - синтаксическая ошибка (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements). TS поддерживает с 3.8 (https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html).
- **Тестирование Web Audio - что реально существует и живо:**
  - `standardized-audio-context-mock` - мок AudioContext и всех узлов (Analyser, BiquadFilter, Gain, AudioWorkletNode и т.д.) для юнит-тестов без рендеринга звука; явно поддерживает Vitest через `setMockingImplementation(vi.fn...)` (https://github.com/chrisguttandin/standardized-audio-context-mock).
  - `node-web-audio-api` (IRCAM) - полноценная реализация Web Audio API для Node.js на Rust (`web-audio-api-rs`), следует спецификации W3C; позволяет гонять реальный аудио-граф в тестах/скриптах, есть polyfill-вход для браузерного кода (https://github.com/ircam-ismm/node-web-audio-api).
  - Старые карма-моки эпохи 2015 не рассматриваются: в 2026 году поддерживаемые варианты - выше (проверено по существованию и активности репозиториев).
- **Как.** Юнит-тесты Vitest для Playlist/Equalizer (логика без DOM); тесты построения графа - с `standardized-audio-context-mock`; e2e Playwright для UI-сценариев (play/pause/next) (https://vitest.dev/guide/, https://playwright.dev/docs/intro).
- **Трудоёмкость/риски.** Средняя, растянутая во времени (миграция TS - файл за файлом). Рисков немного; главный - не превратить в большой-банг рефакторинг (гайд это прямо не рекомендует: https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html).

### 3.8. Апгрейд визуализатора: WebGL сегодня, WebGPU на горизонте

- **Что даёт пользователю.** Зрелищные полноценные визуализации уровня MilkDrop вместо простых баров: тысячи частиц, шейдеры, пост-эффекты, без просадок главного потока.
- **Пути.**
  1. Canvas 2D -> WebGL: готовая библиотека Butterchurn - "WebGL implementation of the Milkdrop Visualizer", подключается к любому `audioContext` + canvas (`butterchurn.createVisualizer(audioContext, canvas, ...)` + `connectAudio(audioNode)`), требует WebGL2, есть пакет пресетов butterchurn-presets (https://github.com/jberg/butterchurn). Она же встроена в Webamp (https://github.com/captbaritone/webamp).
  2. WebGPU - преемник WebGL: "WebGPU is the successor to WebGL", поддержка вычислений общего назначения и современных GPU-фич (https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API). Поддержка на сентябрь 2026: Chrome 113+ (с 144 - на всех платформах, включая Linux), Chrome Android 121+, Firefox 141+ (частично: Windows; macOS на Apple Silicon с 145+; Linux нет), Safari 26 включая iOS (https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/GPU.json). Вывод: WebGL2 - рабочий дефолт, WebGPU - прогрессивное улучшение с feature detection (`navigator.gpu`, https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API).
  3. Вынос рендера из главного потока: `OffscreenCanvas` - канвас, который может рендериться в Web Worker, передаётся как transferable object; поддержка Chrome 69 / Firefox 105 / Safari 16.4 (https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas, https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/OffscreenCanvas.json).
- **Трудоёмкость/риски.** Подключение Butterchurn - низкая (2-3 дня); собственные WebGPU-шейдеры - высокая (WGSL, пайплайны; https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API). Риски: энергопотребление на ноутбуках; безопасность контекста - AudioWorklet/WebGPU требуют HTTPS (https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet, https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API).
- **База для понимания:** официальный гайд MDN по визуализациям на AnalyserNode (https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API).

## 4. Сравнительная таблица направлений

Оценки ценности/усилий/рисков - качественные суждения данного исследования (не из внешних источников).

| # | Направление | Ценность для пользователя | Усилия | Основные риски | Зависимости |
| --- | --- | --- | --- | --- | --- |
| 3.1 | Media Session API | Высокая (системная интеграция) | Очень низкие | Почти нет | Артворк/метаданные (из 3.2 или 3.4) |
| 3.2 | Локальная библиотека + теги | Высокая (главный use-case без сервера) | Средние | Кросс-браузерность файловых API | music-metadata; IndexedDB из 3.3 |
| 3.3 | PWA (установка + офлайн) | Средне-высокая | Низкие-средние | Стратегии кэша аудио, квоты | vite-plugin-pwa |
| 3.4 | Сервер Subsonic/Navidrome (+ Jellyfin) | Высокая для владельцев серверов | Высокие | CORS, различия серверов, объём фич | Слой источников; хорошо сочетается с 3.1 и 3.5 |
| 3.5 | HLS через hls.js | Средняя (радио, длинные стримы) | Низкие-средние | MSE-поддержка платформ (не проверено), CORS | hls.js |
| 3.6 | Десктоп (Tauri/Electron) | Средняя | Низкие на старт, средние на полировку | Разные webview в Tauri (аудио проверить), размер в Electron | Готовый веб-плеер |
| 3.7 | TS + #private + тесты Web Audio | Косвенная (скорость разработки) | Средние, постепенные | Скоуп-крип | Vitest, Playwright, standardized-audio-context-mock / node-web-audio-api |
| 3.8 | Визуализатор WebGL/WebGPU | Средне-высокая (wow-эффект) | Низкие (Butterchurn) / высокие (WebGPU) | Энергопотребление; WebGPU-фрагментация поддержки | Butterchurn; OffscreenCanvas |

## 5. Рекомендуемый короткий список

Приоритет 1 - **осуществить план раздела 2 (Vite 8 + sass + ESLint 10 + Vitest/Playwright + правки autoplay/`#private`)**: без этого любая разработка упирается в неработающую сборку (https://vite.dev/guide/, https://sass-lang.com/blog/node-sass-is-end-of-life, https://eslint.org/docs/latest/use/configure/migration-guide, https://developer.chrome.com/blog/autoplay).

Приоритет 2 - **Media Session API (3.1) + локальная библиотека с тегами (3.2)**: максимальное соотношение ценности и усилий; вместе они превращают демо в приложение, которым пользуются: обложка и теги из файлов (`music-metadata`, https://github.com/Borewit/music-metadata) немедленно дают данные для системных медиа-контролов (https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API).

Приоритет 3 - **PWA-офлайн (3.3)** как усиление 3.2: установка и сохранённая библиотека (Cache Storage + IndexedDB через vite-plugin-pwa; https://web.dev/learn/pwa/offline-data, https://vite-pwa-org.netlify.app/).

Дальше по обстоятельствам: визуализатор на Butterchurn (3.8, дешёвый wow-эффект), Subsonic/Navidrome-клиент (3.4) - если есть свой сервер; десктоп (3.6) - когда веб-версия стабилизируется.

## 6. Что не удалось проверить (не проверено)

- Поддержка MSE (а значит и hls.js) на конкретных платформах/браузерах - проверять на месте (заявление hls.js о работе поверх MSE: https://github.com/video-dev/hls.js).
- Актуальность сопровождения `jsmediatags` (последний релиз/коммит) - данных из первоисточника не собрано.
- Работоспособность Web Audio-графа проекта в WKWebView/WebKitGTK внутри Tauri - требуется ручная проверка.
- Текущая мажорная версия Playwright не зафиксирована (документация не выводит её на прочитанных страницах; https://playwright.dev/docs/intro).
