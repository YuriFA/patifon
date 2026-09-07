# Освежение аудиоплеера и направления развития

Дата исследования: 2026-09-06. Методология: все фактические утверждения о технологиях, API и поддержке браузеров проверены по первоисточникам (MDN Web Docs, W3C/WHATWG-спецификации, официальная документация инструментов, репозитории OSS) и снабжены ссылками. Оценки трудоёмкости и рисков в разделах 3-5 - экспертные оценки для этого проекта, а не цитаты. Версии инструментов зафиксированы на дату исследования.

Разделы 1-2 (текущее состояние и план освежения) потреблены change'ом `migrate-toolchain` (openspec/changes/migrate-toolchain) и удалены по политике пофазного потребления ресерчей. Ниже - направления развития для будущих фаз.

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

| #   | Направление                            | Ценность для пользователя              | Усилия                                  | Основные риски                                              | Зависимости                                                              |
| --- | -------------------------------------- | -------------------------------------- | --------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| 3.1 | Media Session API                      | Высокая (системная интеграция)         | Очень низкие                            | Почти нет                                                   | Артворк/метаданные (из 3.2 или 3.4)                                      |
| 3.2 | Локальная библиотека + теги            | Высокая (главный use-case без сервера) | Средние                                 | Кросс-браузерность файловых API                             | music-metadata; IndexedDB из 3.3                                         |
| 3.3 | PWA (установка + офлайн)               | Средне-высокая                         | Низкие-средние                          | Стратегии кэша аудио, квоты                                 | vite-plugin-pwa                                                          |
| 3.4 | Сервер Subsonic/Navidrome (+ Jellyfin) | Высокая для владельцев серверов        | Высокие                                 | CORS, различия серверов, объём фич                          | Слой источников; хорошо сочетается с 3.1 и 3.5                           |
| 3.5 | HLS через hls.js                       | Средняя (радио, длинные стримы)        | Низкие-средние                          | MSE-поддержка платформ (не проверено), CORS                 | hls.js                                                                   |
| 3.6 | Десктоп (Tauri/Electron)               | Средняя                                | Низкие на старт, средние на полировку   | Разные webview в Tauri (аудио проверить), размер в Electron | Готовый веб-плеер                                                        |
| 3.7 | TS + #private + тесты Web Audio        | Косвенная (скорость разработки)        | Средние, постепенные                    | Скоуп-крип                                                  | Vitest, Playwright, standardized-audio-context-mock / node-web-audio-api |
| 3.8 | Визуализатор WebGL/WebGPU              | Средне-высокая (wow-эффект)            | Низкие (Butterchurn) / высокие (WebGPU) | Энергопотребление; WebGPU-фрагментация поддержки            | Butterchurn; OffscreenCanvas                                             |

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
