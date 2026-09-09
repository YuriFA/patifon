# Продуктовые направления и ландшафт веб-аудио (раунд 2)

Дата исследования: 2026-09-06. Это второй отчёт по проекту; первый - "Освежение аудиоплеера и направления развития" (`refresh-and-development-directions.md`, далее "первый отчёт"). Первый отчёт уже покрыл: Media Session API (3.1), локальную библиотеку с чтением тегов (3.2), PWA (3.3), Subsonic/Navidrome/Jellyfin (3.4), HLS через hls.js (3.5), десктоп-упаковку Tauri/Electron (3.6), TypeScript/тесты (3.7) и базовый апгрейд визуализатора с Butterchurn и WebGPU (3.8). Здесь эти темы не пересказываются, а используются как опоры.

Методология: фактические утверждения о технологиях, API и статусе проектов проверены по первоисточникам (официальная документация, W3C-спецификации, MDN, репозитории и GitHub API для статуса проектов) и снабжены ссылками. Статус репозиториев (живой/архивный, дата последнего push) зафиксирован по GitHub API на дату исследования. Оценки ценности/усилий/рисков - экспертные суждения этого исследования, а не цитаты. Поддержка браузеров - по MDN Browser Compatibility Data (BCD).

# 1. Направление "как Spotify": инженерная деконструкция

"Спортифоподобность" - не одна фича, а стек слоёв. Полезно разложить её на измеримые слои и для каждого честно сказать: собирается ли это одним разработчиком в браузере, легально и без сервера.

## 1.1. Слои "Spotify-подобности"

| Слой                               | Что у Spotify                            | Что реально для этого проекта                                                                                     | Первоисточники                                                                                         |
| ---------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Каталог и стриминг                 | Лицензированный каталог миллионов треков | Невоспроизводимо легально без лицензий. Свои файлы (первый отчёт, 3.2) или самохостинг-сервер (первый отчёт, 3.4) | см. 1.5                                                                                                |
| Библиотека и поиск                 | Индекс по всему каталогу                 | Локальный индекс в IndexedDB + fuzzy-поиск (Fuse.js, см. 1.7)                                                     | https://www.fusejs.io/                                                                                 |
| Плейлисты и очередь                | Синхронизация между устройствами         | Локально - уже есть классы Playlist/Track; персистентность через IndexedDB (первый отчёт, 3.3)                    | -                                                                                                      |
| История прослушиваний (scrobbling) | Внутренняя                               | Last.fm и ListenBrainz - открытые API (см. 1.3)                                                                   | https://www.last.fm/api/scrobbling, https://listenbrainz.readthedocs.io/en/latest/users/api/index.html |
| Рекомендации и дискавери           | ML-движок                                | ListenBrainz: коллаборативная фильтрация по публичным listens (см. 1.3)                                           | https://listenbrainz.readthedocs.io/en/latest/users/api/recommendation.html                            |
| Тексты песен (синхронизированные)  | Лицензированные тексты                   | LRCLIB - бесплатная открытая база с API без ключей (см. 1.2)                                                      | https://lrclib.net/docs                                                                                |
| Social/sharing                     | Профили, шаринг                          | Профиль ListenBrainz/Last.fm даёт публичную страницу истории; собственный social требует сервера                  | https://listenbrainz.org/                                                                              |
| Мобильность/офлайн                 | Нативные клиенты                         | PWA (первый отчёт, 3.3)                                                                                           | https://web.dev/learn/pwa/                                                                             |

Вывод таблицы: почти весь "сервисный" слой Spotify (история, рекомендации, тексты, поиск) воспроизводим поверх открытых API без собственного бэкенда; невоспроизводим только лицензированный каталог.

## 1.2. Тексты песен: LRCLIB

- **Что это.** LRCLIB - открытая база текстов с API, "openly accessible to all users and applications. There is no need for an API key or any kind of registering!" (https://lrclib.net/docs).
- **Ключевые эндпоинты.** `GET /api/get` - лучший матч по `track_name` + `artist_name` (рекомендуются `album_name` и `duration`; "the provided `duration` is crucial" - совпадение в пределах ±2 секунд); `GET /api/search` - поиск по ключевым словам (максимум 20 результатов, без пагинации); ответ содержит и `plainLyrics`, и `syncedLyrics` в LRC-формате с таймкодами вида `[00:17.12]` (https://lrclib.net/docs).
- **Правила приличия.** Rate limit с `429 Too Many Requests` + `Retry-After`; клиент обязан идентифицировать себя в `User-Agent`, а "If modifying `User-Agent` is not possible (for example, browser JavaScript restricts this header), you can use `X-User-Agent` or `Lrclib-Client` as alternatives" - то есть браузерные клиенты прямо предусмотрены (https://lrclib.net/docs).
- **Применимость к проекту.** Прямая: теги из `music-metadata` (первый отчёт, 3.2) дают artist/title/duration, duration из декодированного аудио даёт точный матч; `syncedLyrics` - это готовые данные для караоке-подсветки по `audio.currentTime`. Трудоёмкость: низкая (2-4 дня на интеграцию с кэшированием в IndexedDB). Риски: покрытие базы (404 на отсутствующие треки - штатный ответ), лимиты при сканировании всей библиотеки.

## 1.3. История и рекомендации: Last.fm и ListenBrainz

**Last.fm scrobbling** (https://www.last.fm/api/scrobbling):

- Клиент шлёт `track.updateNowPlaying` при старте трека и `track.scrobble` - POST на `http://ws.audioscrobbler.com/2.0/`, аутентификация обязательна (https://www.last.fm/api/authentication).
- Правило засчёта: трек длиннее 30 секунд И прослушан минимум половину длительности или 4 минуты (что раньше); пакетная отправка до 50 скробблов; ошибки 11/16 - ретраить, 9 - реаутентификация (https://www.last.fm/api/scrobbling).
- Применимость: классический слой "история слушаний + чарты" на пустом месте. CORS API из браузера документацией не описан - см. раздел 5 (не проверено).

**ListenBrainz** (проект MetaBrainz, открытая альтернатива Last.fm):

- API root `https://api.listenbrainz.org`, только HTTPS; аутентификация - user token в заголовке `Authorization: Token ...`; лимит - не больше 1 запроса в секунду на клиента; обязательный информативный `User-Agent` ("Requests without a valid user agent may be blocked") (https://listenbrainz.readthedocs.io/en/latest/users/api/index.html).
- **Рекомендации ML.** "ListenBrainz uses collaborative filtering to generate recording recommendations": `GET /1/cf/recommendation/user/{user_name}/recording` возвращает recording MBID'ы со скорами (эндпоинт помечен как experimental); есть API обратной связи (`POST /1/recommendation/feedback/submit`, рейтинги love/hate и т.п.) (https://listenbrainz.readthedocs.io/en/latest/users/api/recommendation.html).
- Публичная спецификация API: OpenAPI от сообщества - https://github.com/rain0r/listenbrainz-openapi (упомянута в официальных доках: https://listenbrainz.readthedocs.io/en/latest/users/api/index.html).
- Применимость: scrobbling в LB даёт данные для их ML-рекомендаций; для плеера это режим "дискавери по своей истории". Маппинг MBID -> локальный файл работает, если в тегах есть MusicBrainz ID (иначе - нечёткий матч, это инженерная задача, а не гарантия).

## 1.4. Genius API

- REST API с OAuth2 (`client_id`/`client_secret`), эндпоинты: search, songs, artists, referents, annotations, web_pages (https://docs.genius.com/).
- В списке ресурсов нет эндпоинта полного текста песен - API отдаёт метаданные и аннотации, а не сами lyrics (наблюдение по перечню ресурсов: https://docs.genius.com/).
- "Commercial use of the Genius API is not allowed without a license" (https://docs.genius.com/).
- Вывод: для плеера полезен как источник метаданных/аннотаций, но не заменяет LRCLIB для текстов.

## 1.5. Spotify напрямую: Web Playback SDK и ограничения 2024 года

- **Web Playback SDK** - клиентская JS-библиотека: "create a local Spotify Connect device in your browser, stream and control audio tracks from Spotify inside your website"; поддерживается Chrome, Firefox, Safari, Edge на десктопе и мобильных; "requires a Spotify Premium subscription"; для iframe нужны encrypted-media и autoplay; "This SDK must not be used in commercial projects without Spotify's prior written approval" (https://developer.spotify.com/documentation/web-playback-sdk).
- **Ограничения Web API с 2024-11-27.** Для новых приложений закрыты: Related Artists, Recommendations, Audio Features, Audio Analysis, Featured Playlists, Category's Playlists, 30-секундные превью в multi-get ответах, алгоритмические и редакционные плейлисты (https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api). То есть строить "Spotify-рекомендации" поверх Spotify API новый сторонний продукт больше не может.
- Вывод: интеграция возможна только как "ещё один источник треков для Premium-пользователя" и с юридической оговоркой о некоммерческом использовании; рекомендательный слой Spotify для сторонних закрыт.

## 1.6. Funkwhale: федеративный музыкальный сервер

- Funkwhale - "self-hosted audio player and publication platform", федерация через ActivityPub между подами и с Fediverse (https://docs.funkwhale.audio/).
- API: REST (Django REST framework), версия 1 стабильна ("committed to not introducing breaking changes"), v2 в разработке; аутентификация внешних приложений - OAuth; интерактивный explorer - https://docs.funkwhale.audio/swagger/ (https://docs.funkwhale.audio/developer/api/index.html).
- Важно для совместимости: Funkwhale поддерживает подмножество Subsonic API (https://docs.funkwhale.audio/developer/api/subsonic.html) - то есть клиент из первого отчёта (3.4) потенциально покрывает и Funkwhale-поды.
- Документация соответствует версии 2.0.10 (заголовок страниц: https://docs.funkwhale.audio/).
- Вывод: ещё один серверный вариант рядом с Navidrome/Jellyfin, требует своего сервера.

## 1.7. Поиск по локальной библиотеке

- Fuse.js - "Lightweight fuzzy-search library, with zero dependencies"; fuzzy-поиск на алгоритме Bitap, токеный поиск с IDF-ранжированием, расширенные операторы, весовые коэффициенты полей; два билда: полный ~8.6 kB gzip, базовый ~6.8 kB gzip (https://www.fusejs.io/).
- Для библиотеки в десятки тысяч треков этого достаточно: индекс (title/artist/album) грузится в память. Полнотекстовый поисковый движок на данном масштабе - избыточная абстракция; "не надо" здесь осознанное решение, а не пробел.

## 1.8. Реальные Spotify-like OSS-клиенты (статус проверен по GitHub API 2026-09-06)

- **Nuclear** - "Streaming music player that finds free music for you"; TypeScript, AGPL-3.0, 18403 звёзд, последний push 2026-09-06, то есть живой и активный (https://github.com/nukeop/nuclear). Важно: он собирает треки из бесплатных источников (YouTube и т.п.) - сама модель "стриминг чужого каталога без лицензий" юридически уязвима; как референс UX (поиск, плейлисты, queue) полезен, как модель легального продукта - нет (оценка риска - наша, не первоисточник).
- **бывший th-ch/youtube-music.** Запрос репозитория `th-ch/youtube-music` через GitHub API сейчас возвращает запись `pear-devs/pear-desktop` (тот же repo id 182306991) - проект переименован в Pear, Electron-приложение, MIT, 33391 звезда, push 2026-09-03 (https://github.com/pear-devs/pear-desktop). Это неофициальный клиент YouTube Music: технически сильный референс, но использование private API YouTube противоречит их ToS - юридический риск (оценка наша).
- **Cider** (клиент Apple Music): репозиторий Cider 1 **архивирован** (последний push 2024-12-10, https://github.com/ciderapp/Cider); разработка продолжается в `ciderapp/Cider-2` - "Primary public repository for Cider 2.x", push 2026-09-01, 390 звёзд, лицензия в API не указана (https://github.com/ciderapp/Cider-2). Пример того, что клиент стороннего стриминг-каталога - постоянная гонка с изменениями API владельца каталога.
- Клиенты "своих" серверов (airsonic-refix, Jamstash) - уже в первом отчёте, раздел 3.4.

## 1.9. Вывод по разделу 1

Одному разработчику, легально и без бэкенда, собирается "Spotify-опыт" поверх собственной библиотеки: локальная библиотека с тегами (первый отчёт, 3.2) + fuzzy-поиск (Fuse.js) + синхронизированные тексты (LRCLIB) + скробблинг и ML-рекомендации (ListenBrainz, опционально Last.fm) + PWA-мобильность (первый отчёт, 3.3). Требует сервера и/или лицензий: стриминг чужого каталога (Spotify SDK - только Premium и некоммерчески; Nuclear-модель - юридически рискованна), федерация (Funkwhale), собственный social-слой.

# 2. Визуализация как витрина (showcase)

Глубже первого отчёта (там - Butterchurn/WebGL2 и WebGPU как платформа, раздел 3.8). Здесь - конкретные библиотеки, бейт-детект и пререндер волны.

## 2.1. wavesurfer.js: волна уровня SoundCloud

- **Что это.** "Open-source audio visualization library for creating interactive, customizable waveforms"; TypeScript; v7 подключается одним ESM-модулем; HTML5 Audio и Web Audio; BSD-3-Clause; 10401 звезда, push 2026-09-03 - живой (https://wavesurfer.xyz/, https://github.com/katspaugh/wavesurfer.js).
- **Плагины:** Regions ("clickable overlays to mark regions of audio"), Hover, Envelope (фейды и громкость), Record (запись с микрофона с волной в реальном времени), Minimap, Timeline, Spectrogram (FFT); среди официальных примеров - "A soundcloud-style player" и "Web Audio equalizer" (https://wavesurfer.xyz/).
- **Применимость.** Волна всего трека + регионы - это UX-слой, которого проекту не хватает: перемотка по структуре трека, отметки. Отлично сочетается с текстами из LRCLIB (регион на строку). Трудоёмкость: низкая (2-3 дня).

## 2.2. audioMotion-analyzer: спектр-анализатор "из коробки"

- **Уточнение первоисточника:** актуальный репозиторий - `hvianna/audioMotion-analyzer` ("High-resolution real-time graphic audio spectrum analyzer JavaScript module with no dependencies"), AGPL-3.0, 946 звёзд, push 2026-07-19 - живой; демо: https://audioMotion.dev (https://github.com/hvianna/audioMotion-analyzer). Старые ссылки вида alicemirror/audiomotion мертвы (404 на GitHub API). Там же у автора приложение-плеер audioMotion.js (https://github.com/hvianna/audioMotion.js, демо https://audiomotion.app/).
- **Риск лицензии:** AGPL-3.0 - если встраивать библиотеку в свой плеер и отдавать его как веб-сервис, AGPL требует открытости производного кода; для личного/учебного проекта это не проблема, для продукта - осознанное решение (наша интерпретация лицензии, не цитата).
- Трудоёмкость: очень низкая (1-2 дня на подключение к существующему AnalyserNode-графу).

## 2.3. three.js: 3D + аудио-реактивные шейдеры

- В three.js есть встроенный аудио-слой: `THREE.AudioListener`/`THREE.Audio` (с `setMediaElementSource`) и `THREE.AudioAnalyser`; официальный пример "webaudio - visualizer" читает частотные данные в `DataTexture` (`THREE.RedFormat`) и рисует их фрагментным шейдером `ShaderMaterial` - то есть это готовый шаблон "аудио -> текстура -> GLSL" (исходник примера: https://github.com/mrdoob/three.js/blob/dev/examples/webaudio_visualizer.html, живая страница: https://threejs.org/examples/webaudio_visualizer.html).
- Применимость: путь к собственной 3D-визуализации (частицы, объёмные сцены) без написания WebGL с нуля. Трудоёмкость: средняя (неделя+ на собственную сцену; пример собирается за день).

## 2.4. Shadertoy как источник шейдеров

- На Shadertoy опубликованы тысячи аудио-реактивных GLSL-шейдеров; портинг в проект реален (шаблон из 2.3). Лицензия: страница_terms сайта недоступна из среды исследования (HTTP 403, https://www.shadertoy.com/terms), но на страницах самих шейдеров авторы помечают их Creative Commons Attribution-NonCommercial-ShareAlike (например, CC BY-NC-SA 4.0: https://www.shadertoy.com/view/3lc3DS), а сторонние справочники называют дефолтной лицензией сайта CC BY-NC-SA 3.0 (https://github.com/nabeel-oz/glsl-to-mp4/blob/master/references/README.md). NC-условие запрещает коммерческое использование (https://creativecommons.org/licenses/by-nc-sa/4.0/).
- Вывод: для демо/витрины - богатый источник; для коммерческого продукта - только шейдеры авторов с явным разрешением. "Дефолт 3.0" оставляем в разделе 5 как не проверено по первоисточнику.

## 2.5. Бит-детект: синк визуала с ритмом

- **web-audio-beat-detector** (chrisguttandin): "A beat detection utility which is using the Web Audio API"; MIT; 679 звёзд; push 2026-08-30 - живой (https://github.com/chrisguttandin/web-audio-beat-detector).
- **realtime-bpm-analyzer** - внимание, автор не chrisguttandin, а dlepaux: "Library using WebAudioAPI to analyse BPM from files, audionodes... as well as realtime using a microphone"; TypeScript, Apache-2.0, 325 звёзд, push 2026-09-04 - живой (https://github.com/dlepaux/realtime-bpm-analyzer).
- Применимость: пульс/вспышки в такт вместо "плавающих баров"; BPM можно сохранять в индекс библиотеки. Трудоёмкость: низкая-средняя (2-4 дня). Точность детекта на сложном материале - эмпирический риск.

## 2.6. Пререндер волны всего трека: OfflineAudioContext

- `OfflineAudioContext` "doesn't render the audio to the device hardware; instead, it generates it, as fast as it can, and outputs the result to an AudioBuffer"; `startRendering()` возвращает promise с готовым AudioBuffer (https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext).
- Паттерн: `decodeAudioData` -> прогон через OfflineAudioContext (или прямое чтение каналов буфера) -> мин/макс по окнам -> массив пиков -> кэш в IndexedDB -> мгновенная отрисовка волны wavesurfer'ом без повторного декодирования. MDN приводит официальный пример offline-рендера с promise-версией `startRendering()` (https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext).
- Трудоёмкость: низкая-средняя (2-3 дня с кэшем). Тот же механизм годится для офлайн-анализа BPM (2.5).

## 2.7. WebGPU

Поддержка браузеров и статус WebGPU зафиксированы в первом отчёте (раздел 3.8: Chrome 113+/Android 121+, Firefox 141+, Safari 26; https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API). Официальная коллекция примеров заявлена на https://webgpu-samples.org/ - сайт оказался недоступен из среды исследования (см. раздел 5). Практический вывод не меняется: WebGL2 - рабочий дефолт, WebGPU - прогрессивное улучшение с feature detection (`navigator.gpu`).

## 2.8. "Wow"-референсы и оценка усилий

Референсы существования и качества: Webamp - Winamp 2 в браузере, используется Internet Archive (первый отчёт, 3.2: https://github.com/captbaritone/webamp); официальные демо самих библиотек: audioMotion.dev (https://audioMotion.dev), примеры wavesurfer включая soundcloud-style плеер (https://wavesurfer.xyz/examples/), пример three.js (https://threejs.org/examples/webaudio_visualizer.html). Patatap ("portable animation and sound kit", Jono Brandel + Lullatone, сделан на Two.js) существует и знаменит, но это интерактивная звуковая игрушка, а не визуализация трека - как ориентир жанра, не как шаблон (https://patatap.com/).

| Путь                            | Эффект                          | Усилия                       | Риски                                      |
| ------------------------------- | ------------------------------- | ---------------------------- | ------------------------------------------ |
| Butterchurn (первый отчёт, 3.8) | MilkDrop-пресеты                | Очень низкие (2-3 дня)       | WebGL2-only, энергопотребление             |
| audioMotion-analyzer            | Профессиональный спектр         | Очень низкие (1-2 дня)       | AGPL-3.0                                   |
| wavesurfer.js + регионы         | Продуктовая волна + UX          | Низкие (2-3 дня)             | BSD-3, рисков нет                          |
| three.js + свои шейдеры         | Уникальная 3D-сцена             | Средние-высокие (1-3 недели) | Своя поддержка GLSL                        |
| Шейдеры из Shadertoy            | thousands готовых эффектов      | Средние (порт GLSL->WebGL2)  | CC BY-NC-SA: некоммерческое только         |
| Бит-детект + пульс              | Синк с ритмом                   | Низкие-средние               | Точность на живых записях                  |
| WebGPU-компьют                  | Максимальная производительность | Высокие                      | Фрагментация поддержки (первый отчёт, 3.8) |

# 3. Аудио в браузере за пределами плеера (ландшафт)

## 3.1. Синтез и создание музыки

- **Tone.js.** "A Web Audio framework for creating interactive music in the browser": Transport для синхронизации (аналог DAW-транспорта), готовые синтезаторы (`Synth`, `FMSynth`, `PolySynth`), эффекты, `Sampler` (питч-шифт семплов до полного инструмента), сигналы с audio-rate автоматизацией; `Tone.start()` обязан вызываться по жесту пользователя (autoplay policy - первый отчёт, 2.2); MIT, 14716 звёзд, push 2026-09-03 - живой (https://tonejs.github.io/, https://github.com/Tonejs/Tone.js).
- **Strudel (live coding).** Веб-среда live coding алгоритмических паттернов, порт TidalCycles на JavaScript (https://strudel.cc/). Статус: GitHub-репозиторий `tidalcycles/strudel` **архивирован** с описанием "MOVED TO CODEBERG", разработка продолжается на https://codeberg.org/uzu/strudel (AGPL-3.0) (https://github.com/tidalcycles/strudel). Проект жив, просто сменил платформу хостинга.
- **Web MIDI API.** Спецификация: https://webaudio.github.io/web-midi-api/. Поддержка по BCD (интерфейс MIDIAccess): Chrome 43+, Edge - зеркало, Firefox 108+ (только десктоп; на Android нет), **Safari - не поддерживается** (открытая задача WebKit: https://webkit.org/b/107250) (https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/MIDIAccess.json). Для веб-приложения MIDI-вход - фича с graceful degradation.
- **SoundFont-семплеры.** `smplr` - "A web audio sampler instrument" (danigb), TypeScript, 320 звёзд, push 2026-06-13 - живой; лицензия в GitHub API не указана (https://github.com/danigb/smplr, https://danigb.github.io/smplr/). SpessaSynth - "MIDI SoundFont/DLS player and editor written in TypeScript" (spessasus; не spessasium - актуальный owner именно spessasus), Apache-2.0, 395 звёзд, push 2026-09-03; ядро выделено в библиотеку spessasynth_core (https://github.com/spessasus/SpessaSynth, https://github.com/spessasus/spessasynth_core).
- Применимость к этому проекту: синтез - не профиль плеера, но Tone.js уже стоит за waveform-playlist (3.2) и даёт "звуковые пресеты" (например, короткий синтезированный UI-звук или предпрослушивание MIDI-файлов в библиотеке). Web MIDI + SpessaSynth - отдельный продукт-инструмент.

## 3.2. Веб-DAW / редактор

- **waveform-playlist** (naomiaro): "Multitrack Web Audio editor and player with canvas waveform preview. Set cues, fades and shift multiple tracks in time... Export your mix to AudioBuffer or WAV! Add effects from Tone.js. Project inspired by Audacity"; MIT, 1675 звёзд, push 2026-08-17 - живой (https://github.com/naomiaro/waveform-playlist, https://naomiaro.github.io/waveform-playlist/).
- **AudioMass** (pkalogiros): "Free full-featured web-based audio & waveform editing tool"; 2966 звёзд, push 2026-08-20 - живой; лицензия нестандартная (NOASSERTION в GitHub API) (https://github.com/pkalogiros/AudioMass).
- Коммерческие Audiotool (https://audiotool.com/) и Soundation (https://soundation.com/) годами существуют как полноценные браузерные DAW - доказательство зрелости платформы (сам факт существования сервисов; их внутреннее устройство закрыто).
- Вывод: писать свой DAW - отдельный продукт; но редакторские primitives (регионы, фейды) переиспользуются в плеере через wavesurfer (2.1) или waveform-playlist как библиотеку.

## 3.3. Аудиокниги: W3C Audiobooks

- Спецификация "Audiobooks" - **W3C Recommendation от 2020-11-10** (редакторы Wendy Reid, Matt Garrish) (https://www.w3.org/TR/audiobooks/).
- Формат: JSON-LD манифест (контексты schema.org + pub-context); обязательные поля - `conformsTo`, `@context`, `readingOrder` (только аудиоресурсы), `name`; рекомендуемые - автор, `readBy`, обложка, `duration`; оглавление - HTML-элемент с ролью `doc-toc`; "It is strongly recommended that content creators provide a table of contents using media fragments" для глав внутри одного аудиофайла (https://w3c.github.io/audiobooks/ - Editor's Draft, идентичный по структуре REC).
- Спецификация сознательно не определяет рендеринг: "This specification does not define how user agents are expected to render Audiobooks" (https://w3c.github.io/audiobooks/).
- Применимость: если делать "режим аудиокниги" (главы, закладки, скорость 1x-3x), манифест W3C - готовая модель данных. Нативная поддержка браузерами/ридерами не проверена (раздел 5).

## 3.4. Подкасты и радио: PodcastIndex и radio-browser

- **PodcastIndex.org API.** OpenAPI 3, версия 1.12.1; base URL `https://api.podcastindex.org/api/1.0`; группы эндпоинтов: Search, Podcasts (в т.ч. `/podcasts/trending`), Episodes (`/episodes/byfeedid`, `/episodes/live`...), Recent, Value, Stats, Categories, Hub, Add; бесплатный ключ на https://api.podcastindex.org/; авторизация Amazon-стилем: заголовки `User-Agent`, `X-Auth-Date`, `X-Auth-Key`, `Authorization` (https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/root.yaml, живая документация: https://podcastindex-org.github.io/docs-api/).
- **radio-browser.** "Completely free and open source" API сообщества радиостанций: получение списка серверов DNS-lookup'ом `all.api.radio-browser.info`, случайный выбор с failover; обязательный говорящий User-Agent; клики по станциям шлются через `/json/url` для ранжирования; использовать uuid-поля (не id); код сервера открыт, данные зеркалируемы (https://api.radio-browser.info/, GUI: https://www.radio-browser.info/).
- Применимость: "радио-режим" плеера за считанные дни: каталог станций + `<audio>`/HLS (первый отчёт, 3.5). Подкасты - поиск фидов + эпизоды как обычные URL в очередь.

## 3.5. Распознавание и фингерпринтинг

- **AcoustID/Chromaprint.** AcoustID - сервис распознавания аудио: lookup `https://api.acoustid.org/v2/lookup` по `client` (ключ приложения), `duration` и `fingerprint`; отпечаток генерирует открытая библиотека Chromaprint; лимит - не более 3 запросов/сек; сервис бесплатен только для некоммерческого применения (https://acoustid.org/, https://acoustid.org/webservice, https://acoustid.org/chromaprint). Ответ содержит связанные MusicBrainz recording ID и метаданные (https://acoustid.org/webservice).
- Ограничение для браузера: Chromaprint - нативная C++-библиотека; готового официального WASM-порта для браузера мы не нашли (раздел 5). Практический смысл для плеера: опознавание "безымянного" MP3 до тегов.
- **Web Speech API.** Две части (https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API):
  - `SpeechSynthesis` (TTS): Chrome 33+, Firefox 49+, Safari 7+, Edge 14+ - широкая поддержка (https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SpeechSynthesis.json). Применимость: озвучивание метаданных, доступность.
  - `SpeechRecognition` (ASR): по BCD Chrome 139+ без префикса (33+ с `webkit`), Safari 14.1+ с `webkit`, Firefox 142+ **только с флагом** `media.webspeech.recognition.enable`; распознавание может идти on-device и регулируется Permissions-Policy `on-device-speech-recognition` (https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SpeechRecognition.json, https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API). Спецификация: https://webaudio.github.io/web-speech-api/.
  - Для транскрипции музыки/аудиокниг SpeechRecognition не подходит (это распознавание речи с микрофона/дорожки, не файлов общего вида); для файлов - Whisper (3.6).

## 3.6. AI-аудио в браузере: transformers.js

- transformers.js - "Run Transformers directly in your browser, with no need for a server"; работает на ONNX Runtime; по умолчанию CPU/WASM, `device: 'webgpu'` включает GPU; квантование `dtype` (fp16, q8, q4...) для приемлемого веса моделей (https://huggingface.co/docs/transformers.js/index).
- Аудио-задачи в официальном списке поддерживаются: **automatic-speech-recognition** (транскрипция, Whisper-класс моделей доступен через фильтр Hub: https://huggingface.co/models?pipeline_tag=automatic-speech-recognition&library=transformers.js), **audio-classification**, **text-to-speech**, **zero-shot-audio-classification** (https://huggingface.co/docs/transformers.js/index). Репозиторий: Apache-2.0, 16289 звёзд, push 2026-09-05 - живой (https://github.com/huggingface/transformers.js); официальная коллекция примеров: https://github.com/huggingface/transformers.js-examples.
- Применимость к плееру: локальная транскрипция аудиокниг/подкастов (Whisper в браузере), автотегирование через audio-classification (жанр/настроение). Риски: вес моделей (десятки-сотни МБ), скорость на WASM; WebGPU смягчает, но его поддержка фрагментирована (первый отчёт, 3.8).

## 3.7. Пространственный звук

- Ванильный Web Audio: `PannerNode` позиционирует источник в 3D; `panningModel` принимает `equalpower` (дефолт) и `HRTF` - "renders a stereo output of higher quality than equalpower - it uses a convolution with measured impulse responses from human subjects", то есть бинауральный рендер из коробки (https://developer.mozilla.org/en-US/docs/Web/API/PannerNode, https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/panningModel).
- **Resonance Audio (Google) для веба - мёртв:** репозиторий resonance-audio/resonance-audio-web-sdk **архивирован**, последний push 2022-03-08 (https://github.com/resonance-audio/resonance-audio-web-sdk). Вывод: для HRTF-пространственности полагаться на штатный PannerNode, а не на заброшенный SDK.

## 3.8. Реалтайм и коллаборативное: WebRTC

- WebRTC - peer-to-peer аудио/видео/данные в браузере без плагинов: `RTCPeerConnection`, `MediaStream`/`MediaStreamTrack`, `RTCDataChannel` (https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API).
- **Живой OSS-пример:** fourhands - "p2p piano", "uses WebRTC to establish p2p connections for minimal latency 2-person jamming using MIDI keyboards"; целевая задержка - one-way 20 ms или меньше (по словам автора); Chrome/Edge работают, Firefox - нет (нет Web MIDI); нужен HTTPS для MIDI (https://github.com/jminjie/fourhands). Небольшой проект (34 звезды), но рабочий образец жанра.
- jamrtc (jam-сессии на Janus SFU, 235 звёзд) существует, но не развивается: последний push 2021-04-23 (https://github.com/lminiero/jamrtc).
- Физика жанра: полный P2P-джем с аудио требует задержек <~30-50 мс, что достижимо не всегда; обходной путь - передавать MIDI/события вместо звука (как fourhands) или лупы с отложенным наложением. Применимость к плееру: минимальная (отдельный продукт), но WebRTC DataChannel полезен для "shared listening" (синхронный просмотр очереди).

# 4. Синтез: сравнение, комбинации, короткий список

## 4.1. Сравнительная таблица новых направлений

Оценки - суждения этого исследования. "Зависимости" - что нужно сверх текущего кода.

| Направление                   | Ценность для плеера            | Усилия          | Основные риски                                    | Зависимости                                     |
| ----------------------------- | ------------------------------ | --------------- | ------------------------------------------------- | ----------------------------------------------- |
| Тексты LRCLIB (1.2)           | Высокая (караоке-синхрон)      | Низкие          | Покрытие базы, rate limit                         | Теги из 3.2 первого отчёта                      |
| Scrobbling Last.fm/LB (1.3)   | Средне-высокая                 | Низкие          | CORS из браузера (не проверено)                   | Учётная запись пользователя                     |
| Рекомендации LB (1.3)         | Средняя (дискавери)            | Средние         | Experimental API; маппинг MBID                    | Скробблинг + MusicBrainz ID в тегах             |
| Поиск Fuse.js (1.7)           | Высокая (UX)                   | Очень низкие    | Почти нет                                         | Индекс библиотеки                               |
| Spotify SDK (1.5)             | Низкая для OSS-плеера          | Средние         | Premium-only, некоммерческое, закрытие API с 2024 | OAuth, EME                                      |
| Funkwhale-клиент (1.6)        | Средняя (для владельцев подов) | Средне-высокие  | Федерация, сервер                                 | Слой источников как в 3.4 первого отчёта        |
| wavesurfer.js (2.1)           | Высокая                        | Низкие          | Нет существенных                                  | -                                               |
| audioMotion-analyzer (2.2)    | Средне-высокая                 | Очень низкие    | AGPL-3.0                                          | -                                               |
| three.js + шейдеры (2.3)      | Средняя (wow)                  | Средние-высокие | Собственный GLSL                                  | three.js                                        |
| Шейдеры Shadertoy (2.4)       | Средняя                        | Средние         | CC BY-NC-SA (NC!)                                 | Порт GLSL                                       |
| Бит-детект (2.5)              | Средняя                        | Низкие-средние  | Точность                                          | web-audio-beat-detector / realtime-bpm-analyzer |
| Пререндер волны (2.6)         | Высокая                        | Низкие-средние  | Время декодирования больших файлов                | OfflineAudioContext, IndexedDB                  |
| Синтез Tone.js/Web MIDI (3.1) | Низкая для плеера              | Средние         | Safari без Web MIDI                               | Tone.js                                         |
| Live coding Strudel (3.1)     | Низкая (другой продукт)        | Высокие         | AGPL, Codeberg-хостинг                            | strudel                                         |
| Редактор/DAW (3.2)            | Низкая для плеера              | Очень высокие   | Конкуренция с Audacity                            | waveform-playlist                               |
| Аудиокниги W3C (3.3)          | Средняя (режим глав)           | Средние         | Поддержка ридерами не проверена                   | Манифест-модель                                 |
| Подкасты PodcastIndex (3.4)   | Средняя                        | Низкие-средние  | Ключ API, CORS (не проверено)                     | Слой источников                                 |
| Радио radio-browser (3.4)     | Средне-высокая                 | Очень низкие    | Стабильность зеркал                               | `<audio>`/HLS из 3.5 первого отчёта             |
| AcoustID (3.5)                | Средняя (опознавание)          | Высокие         | Нет браузерного Chromaprint                       | WASM-порт (не проверено)                        |
| Web Speech TTS/ASR (3.5)      | Низко-средняя                  | Низкие          | Firefox ASR за флагом; не для файлов              | -                                               |
| AI transformers.js (3.6)      | Средне-высокая (wow + польза)  | Высокие         | Вес моделей, скорость                             | ONNX, WebGPU желательно                         |
| HRTF-пространство (3.7)       | Низкая для музыки              | Низкие-средние  | Редкий use-case                                   | PannerNode                                      |
| WebRTC-джемы (3.8)            | Низкая для плеера              | Высокие         | Задержки                                          | Сервер сигналинга                               |

## 4.2. Комбинации с первым отчётом

- LRCLIB + тексты и теги: теги (3.2 первого отчёта) дают artist/title/duration -> точный матч `/api/get`.
- Скробблинг + Media Session (3.1 первого отчёта): один и тот же источник метаданных питает системные контролы и scrobble.
- Радио/подкасты + HLS (3.5 первого отчёта): потоки radio-browser часто HLS/ICYS - hls.js уже в плане.
- Пререндер волны + библиотека (3.2) + PWA (3.3): пики трека - ещё один тип данных в IndexedDB рядом с тегами и обложками.
- Визуализация: Butterchurn/WebGL2 (3.8 первого отчёта) + бит-детект + аудио-текстура three.js (2.3) - три уровня сложности одной идеи.
- AI: transformers.js (WebGPU) опирается на ту же матрицу поддержки WebGPU, что и раздел 3.8 первого отчёта.

## 4.3. Рекомендуемый короткий список

1. **"Spotify без сервера", этап A: Fuse.js + LRCLIB + скробблинг ListenBrainz.** Максимальный продуктовый эффект на единицу усилий: поиск по библиотеке, синхронизированные тексты, история и ML-рекомендации - всё на открытых бесплатных API без бэкенда и без лицензионных вопросов (https://www.fusejs.io/, https://lrclib.net/docs, https://listenbrainz.readthedocs.io/en/latest/users/api/index.html). Комбинируется с приоритетами 2-3 первого отчёта.
2. **Витрина визуализации: wavesurfer.js + пререндер пиков (OfflineAudioContext) + один спектр-движок (audioMotion-analyzer или Butterchurn из 3.8 первого отчёта) + бит-детект.** Это демо-страница, которую не стыдно показать: волна SoundCloud-стиля, тактовый пульс, спектр (https://wavesurfer.xyz/, https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext, https://github.com/hvianna/audioMotion-analyzer, https://github.com/dlepaux/realtime-bpm-analyzer).
3. **Радио-режим на radio-browser (+ PodcastIndex позже).** Почти бесплатная новая функция с высокой повседневной ценностью; серверов не нужно, API открыт (https://api.radio-browser.info/).
4. **(Растяжка) Локальная AI-транскрипция через transformers.js** - Whisper-транскрипция подкастов/аудиокниг целиком в браузере; дорого по усилиям и ресурсам, но это уникальная фича, невозможная в плеерах прошлых поколений (https://huggingface.co/docs/transformers.js/index).

Чего осознанно не делать: Spotify SDK (Premium-only + запрет коммерческого использования + закрытие рекомендательных эндпоинтов), Nuclear-модель стриминга из бесплатных источников (юридически рискованна), свой DAW и свой jam-сервис (отдельные продукты).

# 5. Что не удалось проверить (не проверено)

- **CORS API Last.fm, ListenBrainz, PodcastIndex из браузера.** Документация не описывает CORS-заголовки; способность чисто клиентского плеера слать запросы напрямую (без прокси) нужно проверять живым запросом (документация: https://www.last.fm/api/scrobbling, https://listenbrainz.readthedocs.io/en/latest/users/api/index.html, https://raw.githubusercontent.com/Podcastindex-org/docs-api/master/api_src/root.yaml).
- **webgpu-samples.org** недоступен из среды исследования (ошибка соединения); содержимое образцов compute-шейдеров не просмотрено (сам сайт заявлен как официальная коллекция примеров: см. https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API из первого отчёта).
- **Дефолтная лицензия Shadertoy.** Страница terms отдаёт HTTP 403; "CC BY-NC-SA 3.0 по умолчанию" подтверждено только сторонними источниками (https://www.shadertoy.com/terms, https://github.com/nabeel-oz/glsl-to-mp4/blob/master/references/README.md); индивидуальные шейдеры с явной пометкой CC BY-NC-SA 4.0 видны на страницах шейдеров.
- **Chromaprint в браузере.** Официального WASM-порта для генерации отпечатков не найдено; реализуемость фингерпринтинга без сервера не подтверждена (https://acoustid.org/chromaprint).
- **Поддержка W3C Audiobooks браузерами и ридерами** на сентябрь 2026 не проверена по первоисточникам; спецификация рендеринг не определяет (https://www.w3.org/TR/audiobooks/).
- **Актуальная активность fourhands** (дата последнего коммита не отобразилась на полученной странице GitHub; звёзд 34, демо заявлено живым) - проект мал, рассчитывать на сопровождение нельзя (https://github.com/jminjie/fourhands).
- **Точность бит-детекта** web-audio-beat-detector и realtime-bpm-analyzer на конкретных жанрах - требуется собственный тест на реальных треках (https://github.com/chrisguttandin/web-audio-beat-detector, https://github.com/dlepaux/realtime-bpm-analyzer).
- **Лицензии smplr и Cider-2** не определены в GitHub API (поле license = null); юридический статус использования нужно читать в репозиториях (https://github.com/danigb/smplr, https://github.com/ciderapp/Cider-2).
