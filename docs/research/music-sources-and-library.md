# Откуда легально брать музыку файлами и как наводить порядок в библиотеке

Дата исследования: 2026-09-07. Контекст: наш плеер - это локальная библиотека на собственных файлах (drag-and-drop / File System Access, теги читаются `music-metadata`, индекс в IndexedDB; см. раздел 3.2 в `docs/research/refresh-and-development-directions.md`). Вопрос этого документа: откуда пользователь легально берёт сами файлы и как поддерживать растущую коллекцию в порядке.

Методология: каждый сервис проверен на живость на дату исследования (доступность сайта по HTTP, активность репозиториев и последние релизы, текущий владелец по официальным источникам). Все утверждения о лицензиях и форматах снабжены ссылками на первоисточники: официальные страницы сервисов, справочные центры, репозитории, API. Серым зонам (торренты, рипперы стриминговых сервисов, загрузчики с YouTube) в документе места нет: их основное использование нарушает авторские права. Оценки и практические рекомендации в разделах 5-6 - экспертные суждения этого исследования.

## 1. Бесплатные легальные каталоги

### Internet Archive (archive.org)

Статус: жив (страницы коллекций отдают HTTP 200 на 2026-09-07; на странице Live Music Archive - актуальные материалы 2026 года).

Несколько огромных аудиоколлекций, каждая - отдельная «полка» на archive.org:

- **Live Music Archive / etree** (https://archive.org/details/etree) - концертные записи (в первую очередь джэм- и рок-групп), 303 940 объектов по запросу к API archive.org на 2026-09-07 (https://archive.org/advancedsearch.php?q=collection%3Aetree&output=json). Правовой статус каждого объекта виден на его странице и в метаданных; коллекция существует в экосистеме, где исполнители разрешают обмен записями своих концертов (сам FAQ коллекции описывает правила загрузки: https://archive.org/details/etree).
- **Great 78 Project** (https://archive.org/details/georgeblood) - 187 039 оцифрованных грампластинок на 78 об/мин, «for preservation, research, and discovery» (описание коллекции в метаданных archive.org); сами записи в основном уже в общественном достоянии из-за возраста.
- **Netlabels** (https://archive.org/details/netlabels) - 80 431 объект; «complete, freely downloadable/streamable, often Creative Commons-licensed catalogs» виртуальных лейблов, раздают MP3/OGG (описание коллекции).
- **Audio Archive / Community Audio** (https://archive.org/details/audio) - открытые загрузки пользователей: музыка, старое радио, записи чтений и прочее.

Форматы: у аудиобъектов IA отдаются исходные файлы и производные - например, у типового объекта Live Music Archive доступны Flac, VBR MP3 и Ogg Vorbis (метаданные объекта: https://archive.org/metadata/oar2006-01-14.mix.flac16, страница: https://archive.org/details/oar2006-01-14.mix.flac16). То есть lossless-FLAC для архива и MP3 для совместимости лежат рядом.

Любопытная деталь для нашего проекта: сам Internet Archive встраивает Webamp (Winamp 2, переписанный на TypeScript) как один из плееров прослушивания аудио и предпросмотра скинов - это прямо заявлено в README Webamp (https://github.com/captbaritone/webamp) и в посте блога IA (https://blog.archive.org/2018/10/02/dont-click-on-the-llama/). Наш плеер решает ту же задачу - слушать файлы прямо в браузере.

### Jamendo

Статус: жив; с 2025 года - в группе Winamp (Llama Group).

- Каталог: «600,000+ free songs from 40,000+ independent artists» с главной страницы (https://www.jamendo.com/). Скачивание и стриминг бесплатны для личного прослушивания; для коммерческого использования (видео, приложения) работает отдельный сервис Jamendo Licensing (https://licensing.jamendo.com/).
- Лицензии: треки публикуются под лицензиями Creative Commons - лицензия видна у каждого трека; например, открытые данные Openverse для трека Jamendo показывают «CC BY-NC-ND 3.0» (https://api.openverse.org/v1/audio/5d08a8ad-73b2-45e8-a26d-e1363add3c85/). Для личной фонотеки NC-ограничения не мешают.
- Формат загрузок: MP3 (в данных трека выше - mp3 320); lossless Jamendo для бесплатного скачивания не отдаёт.
- Владелец: оператор - Jamendo S.A., Люксембург (https://licensing.jamendo.com/en/legal/termsofuse). В марте 2025 Llama Group (бельгийская компания, бренд Winamp) объявила, что Jamendo (Music и Licensing), Bridger и Hotmix входят под «зонтик» Winamp как дочерние структуры (пресс-релиз: https://winamp.com/press/llama-group-strengthens-winamp-ecosystem-ahead-of-major-commercial-push).

### Free Music Archive (FMA)

Статус: жив (блог обновляется, последняя публикация на главной - июнь 2026: https://freemusicarchive.org/home); владельцем с 2015 года является Tribe of Noise (пресс-релиз о приобретении: https://www.prweb.com/releases/global-music-community-tribe-of-noise-acquires-free-music-archive-811726402.html; шапка сайта: «FMA - Powered by Tribe of Noise», https://freemusicarchive.org/).

- Модель: «Instant access to independent artists and original music. Free to play, download and share» - бесплатное прослушивание, скачивание и шаринг для обнаружения музыки и личного использования; для медиа-проектов продаётся Tribe of Noise PRO (та же главная).
- Лицензии: «Most of the music on Free Music Archive is licensed under one of the popular Creative Commons licenses», у каждого трека на странице видна конкретная лицензия; часть произведений - CC0 или общественное достояние (FAQ: https://freemusicarchive.org/faq). Есть фильтр поиска по типу лицензии (там же).
- Формат: загрузки в MP3 (исторически так; lossless FMA массово не раздаёт).

### Musopen

Статус: жив (сайт за анти-бот защитой Cloudflare; свежий снимок в Wayback Machine от 2026-08-29 подтверждает работу: https://web.archive.org/web/20260829023013/https://musopen.org/).

- Что это: некоммерческая организация 501(c)(3) из Сан-Франциско, «recordings, sheet music, and textbooks to the public for free, without copyright restrictions» - то есть записи в общественном достоянии или свободные по лицензии, прежде всего классика (https://musopen.org/).
- Условия: бесплатный план Lite - 5 скачиваний в день; платный Member ($55/год) - безлимит и «Lossless audio» (страница тарифов: https://musopen.org/signup/).
- Формат: бесплатно - MP3; lossless - с подпиской (там же).

### Openverse

Статус: жив (API отдаёт результаты, https://api.openverse.org/v1/audio/; свежий снимок сайта в Wayback - 2026-09-06). Проект разрабатывается в репозитории WordPress/openverse, «search engine for openly licensed media» (https://docs.openverse.org/).

- Что даёт: метапоиск свободно лицензированного аудио по многим источникам сразу - в выдаче видны провайдеры freesound и jamendo (пример ответа API: https://api.openverse.org/v1/audio/?q=piano&page_size=2), с фильтрами по типу лицензии CC и прямыми ссылками на исходные файлы (mp3, а у некоторых записей и lossless-оригиналы в alt_files, например WAV с freesound - там же).
- Для нашего пользователя это не хранилище, а «поисковик по легальным каталогам»: нашёл трек - скачал с первоисточника.

### ccMixter

Статус: жив (главная обновляется треками 2026 года: https://ccmixter.org/). «A community remix site operated by ArtisTech Media, created by Creative Commons» - мета-описание сайта.

- Что даёт: ремиксы, сэмплы, a-cappella под лицензиями Creative Commons; «It's free to use if you give us credit» (https://ccmixter.org/). Отдельный поиск музыки по стилю/BPM/инструменту: http://dig.ccmixter.org/
- Формат: файлы лежат прямыми ссылками в MP3 (пример трека с прямой ссылкой на файл: https://ccmixter.org/files/Zenboy1955/71021).
- Оговорка: сайт живёт на пожертвования (Patreon) и переживал периоды нестабильности; как источник «фона» - хорош, как гарантированный архив - нет.

### Wikimedia Commons

Статус: жив (https://commons.wikimedia.org/). Хранилище свободных медиа для проектов Wikimedia: принимается только «free content» (общественное достояние и свободные лицензии; https://commons.wikimedia.org/wiki/Commons:Project_scope).

- Форматы аудио: MP3, Ogg (кодеки Vorbis, Opus, FLAC, Speex), WebM, FLAC, WAVE, MIDI; патентно-обременённые форматы вроде AAC не принимаются (https://commons.wikimedia.org/wiki/Commons:File_types). Нюанс: FLAC на Commons ограничен лимитом размера, «anything but short clips» (та же страница) - длинные записи ищите в IA.
- Для фонотеки интересны прежде всего исторические записи и народная музыка; искать аудио удобно через Openverse (выше) или категории Commons.

## 2. Платные магазины файлов (без DRM)

Общий принцип: везде ниже покупка означает получение обычного файла без DRM, который ложится в локальную библиотеку и читается нашим плеером с тегами и обложкой.

### Bandcamp

Статус: жив и активен (редакционные материалы Bandcamp Daily от сентября 2026: https://bandcamp.com/). Куплен Epic Games в 2022, продан Songtradr в 2023 (пресс-релиз Songtradr: https://www.songtradr.com/blog/posts/songtradr-bandcamp-acquisition).

- Модель: «онлайн-магазином и сообществом» артисты продают музыку напрямую фанам; в среднем 82% денег покупки получает артист/лейбл, фанаты выплатили артистам $1.79 млрд (https://bandcamp.com/about).
- Name-your-price: артист может разрешить фанату называть цену самому, включая бесплатное скачивание («let fan name price»; https://blog.bandcamp.com/2010/04/01/name-your-price-physical/, https://get.bandcamp.help/en/articles/15263193-what-are-bandcamp-s-fees).
- Форматы скачивания покупки: MP3 V0, MP3 320, FLAC, AAC, Ogg Vorbis, ALAC, WAV, AIFF - выбор в выпадающем меню скачивания (справка: https://get.bandcamp.help/en/articles/15263234-in-which-formats-can-i-download-my-purchases). Рекомендация по выбору формата - у них же: https://get.bandcamp.help/en/articles/15263285-which-audio-format-should-i-download
- Для локальной библиотеки это идеальный магазин: FLAC/ALAC одной кнопкой, теги заполняет артист/лейбл.

### Qobuz Store

Статус: жив (https://www.qobuz.com/). Магазин загрузок позиционирует себя лидером Hi-Res: «Buy your favourite albums in lossless CD or Hi-Res quality and enjoy them forever» - покупка навсегда, скачивание в разных форматах (FAQ на https://www.qobuz.com/nl-nl/discover).

- Форматы: WAV, AIFF, ALAC, FLAC вплоть до 24-бит/192 кГц, плюс MP3 320 (справка: https://help.qobuz.com/en/articles/10167-what-are-the-different-audio-formats-available-for-download).
- Подписка для стриминга не нужна для покупок (там же в FAQ).

### 7digital

Статус: компания жива как B2B-провайдер, но потребительский магазин фактически заморожен. 7digital (лондонская B2B-компания музыкальных сервисов) куплена Songtradr в 2023 (https://www.songtradr.com/blog/posts/songtradr-7digital-acquisition, https://www.musicbusinessworldwide.com/songtradr-closes-23-4m-acquisition-of-b2b-music-firm-7digital/). Розничные витрины (например, https://nl.7digital.com/) формально онлайн и заявляют «DRM-vrije MP3 muziekdownloads» с 16/24-bit FLAC, но подборки на витрине на 2026-09-07 состоят из релизов 2018 года - каталог не обновляется. Для покупок в 2026 году не рекомендуем.

### Bleep

Статус: жив (магазин инди/электронной музыки; итоги года «Albums of the Year 2025» опубликованы: https://bleep.com/albums-of-the-year-2025, анонсы релизов 2026 года - в декабре 2025). Сайт закрыт анти-бот защитой (на автоматические запросы отвечает отказом), витрина открывается в браузере (https://bleep.com/).

- Форматы: витрина продаёт загрузки в категориях Download MP3, WAV/FLAC и 24bit WAV (категории форматов на https://bleep.com/).
- Профиль: электроника и инди, много изданий лейблов; для DJs и коллекционеров винила + загрузки.

### Beatport

Статус: жив (сайт за Cloudflare; справочный центр активен, статья обновлена 2026-05-05: https://support.beatport.com/hc/en-us/articles/8980748912020-Upgrading-Purchased-tracks-from-MP3-to-Lossless).

- Магазин электронной музыки для DJs: базовый формат покупки - MP3, lossless - WAV или AIFF (апгрейд купленного трека до lossless за доплату разницы; та же статья справки).
- lossless-кодеки у Beatport - только WAV/AIFF (FLAC в выборе апгрейда отсутствует; там же).

### iTunes Store (Apple)

Статус: жив. Покупная музыка из iTunes Store - AAC без DRM: с 6 января 2009 все песни каталога стали продаваться без DRM («All Songs DRM-Free», пресс-релиз Apple: https://www.apple.com/newsroom/2009/01/06Changes-Coming-to-the-iTunes-Store/); такие треки называются iTunes Plus и кодируются в AAC 256 кбит/с без ограничений использования (справка Apple: https://support.apple.com/guide/music/intro-to-the-itunes-store-mus3e2346c2/mac). Файлы .m4a ложатся в локальную библиотеку; теги в MP4-контейнере читает `music-metadata` (https://github.com/Borewit/music-metadata).

## 3. Оцифровка собственных CD

Правовая рамка (оговорка): копирование собственного легально купленного аудио-CD для личного прослушивания в большинстве юрисдикций подпадает под «частное копирование» и считается законным, но не везде; в ряде стран законодательство о частном копировании ограничено или отсутствует. Это общее соображение, не юридическая консультация - проверяйте местное право. Раздача рипа другим лицам нарушением будет практически везде.

Инструменты:

- **macOS, Music.app**: штатный путь - вставить CD, импортировать; кодировщик по умолчанию AAC, меняется в Music > Settings > Files > Import Settings («Import Using»); есть «Use error correction when reading Audio CDs» для точного чтения (гайды Apple: https://support.apple.com/guide/music/import-songs-from-cds-mus2935/mac, https://support.apple.com/guide/music/import-settings-muscd653d63/mac). Просто и легально; но для серьёзного архива точность и логи рипа важнее.
- **macOS, XLD (X Lossless Decoder)** - рекомендуемый риппер: бесплатный, открытый, «native» на Apple Silicon; умеет ripping CD (с 2008), вывод в Apple Lossless, FLAC, WAV, Ogg, MP3 и др., работает с cue-листами и поддерживает сверку с базой AccurateRip (упоминания AccurateRip - в истории изменений сайта). Сайт обновлялся 2025-03-02 (обновлены FLAC 1.5.0 и др.): https://tmkk.undo.jp/xld/
- **Windows, EAC (Exact Audio Copy)**: бесплатен «for non-commercial purposes», читает диск «almost perfectly» c multi-reading verify и AccurateRip (https://www.exactaudiocopy.de/).
- **Linux, whipper**: Python-риппер, «accuracy over speed»: Test & Copy, сверка с AccurateRip, метаданные из MusicBrainz, вывод во FLAC (https://github.com/whipper-team/whipper). Репозиторий жив (коммиты 2026-02-17), но релизы выходят редко (последний v0.10.0 - 2021).
- **AccurateRip** - база контрольных сумм рипов для сверки точности: http://www.accuraterip.com/ (доступен, HTTP 200 на 2026-09-07).

Lossless vs lossy при рипе: рипьте один раз в lossless (FLAC или ALAC) - это побитовая копия аудиодорожки CD (16 бит/44.1 кГц), из которой позже можно получить любую lossy-версию; сразу в MP3/AAC рипать архив смысла нет - при смене кодека/битрейта придётся рипать заново. Оценка данного исследования; согласуется с практикой всех перечисленных рипперов, где lossless - формат по умолчанию для точных рипов.

## 4. Порядок в библиотеке: beets и MusicBrainz Picard

- **beets** (CLI) - «media library management system for obsessive music geeks»: каталогизирует коллекцию и «automatically improving its metadata as it goes using the MusicBrainz database», плагины добирают обложки, тексты, жанры, акустические отпечатки; переименование/раскладка файлов по шаблонам; отдельный плагин ищет дубликаты треков и альбомов (https://beets.io/, https://beets.readthedocs.io/en/latest/plugins/duplicates.html). Статус: жив и активен - последний релиз v2.13.1 от 2026-07-29, коммиты в репозитории на дату исследования (https://github.com/beetbox/beets).
- **MusicBrainz Picard** (GUI) - официальный тегер MusicBrainz: переименование и сортировка файлов «exactly the way you want it», идентификация по акустическим отпечаткам AcoustID (работает даже для файлов без тегов), поиск данных целого CD, обложки, скриптовый язык тегов, плагины; форматы: MP3, FLAC, OGG, M4A, WMA, WAV и др. (https://picard.musicbrainz.org/). Статус: жив - релиз 2.13.3 от 2025-02-17, активная разработка (https://github.com/metabrainz/picard).

Связка с нашим плеером: beets и Picard пишут стандартные теги - ID3v2 в MP3, Vorbis comments во FLAC/OGG, атомы MP4 в M4A/ALAC - а именно их наш плеер и читает через `music-metadata` (ID3v1/v2.2-2.4, Vorbis comments, MP4/iTunes и др.; https://github.com/Borewit/music-metadata). То есть конвейер «beets/Picard наводит порядок на диске -> пользователь открывает папку в нашем плеере -> теги, обложки и структура на месте» работает без каких-либо интеграций. Рекомендуемая практика: держать единую схему «исполнитель/год - альбом/NN - трек», которую задаёт и beets, и Picard - тогда плееру достаточно пройтись по папке.

## 5. Форматы и качество (коротко)

FLAC - открытый lossless-кодек Xiph.Org, стандарт де-факто для архивной копии: сжатие без потерь, поддержка метаданных и обложек (https://xiph.org/flac/); на macOS его «зеркало» - ALAC от Apple. MP3 и AAC - совместимые lossy-форматы «для всего» (AAC 256 - формат iTunes Store, см. выше). Практические правила: хранить master-копию в lossless (FLAC/ALAC), lossy-версии получать из неё при необходимости; никогда не перекодировать lossy в lossless («транскод») - потерянное качество не восстанавливается, а файл разбухает; принцип generation loss прямо описан в правилах Wikimedia Commons (https://commons.wikimedia.org/wiki/Commons:File_types). Hi-Res (24-бит/96-192 кГц) имеет смысл только когда источник действительно Hi-Res (покупки Qobuz/Bleep 24-bit); рип CD - это 16 бит/44.1 кГц, и «улучшить» его до 24-бит невозможно. Оценки этого абзаца - данного исследования, кроме прямо упомянутых источников.

## 6. Сводка и рекомендация для macOS

Статус всех сервисов проверен на 2026-09-07.

| Источник                                            | Тип                      | Лицензия/условия для личного прослушивания                                   | Форматы                                                      | Статус на 2026-09-07                                                            |
| --------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Internet Archive (LMA, 78rpm, netlabels, Community) | Бесплатно                | Общественное достояние / CC / политики артистов - статус на странице объекта | FLAC, MP3 (VBR), Ogg Vorbis                                  | Жив (коллекции 200 OK, сотни тысяч объектов)                                    |
| Jamendo                                             | Бесплатно                | CC (у каждого трека); коммерческое - через Jamendo Licensing                 | MP3 320                                                      | Жив; с 2025 в группе Winamp (Llama Group)                                       |
| Free Music Archive                                  | Бесплатно                | Преимущественно CC, есть CC0/PD; фильтр по лицензии                          | MP3                                                          | Жив; владелец Tribe of Noise (с 2015)                                           |
| Musopen (классика)                                  | Бесплатно                | Общественное достояние / свободные лицензии                                  | MP3 (бесплатно), lossless (подписка $55/год)                 | Жив (за Cloudflare; снимок 2026-08-29)                                          |
| Openverse                                           | Метапоиск                | Фильтры CC/PD; файлы у первоисточников                                       | MP3, у части источников WAV и др.                            | Жив (API 200; проект WordPress/openverse)                                       |
| ccMixter                                            | Бесплатно                | CC с указанием авторства                                                     | MP3                                                          | Жив; оператор ArtisTech Media                                                   |
| Wikimedia Commons                                   | Бесплатно                | Только свободные лицензии/PD                                                 | MP3, Ogg Vorbis/Opus, FLAC, WAV, WebM, MIDI                  | Жив                                                                             |
| Bandcamp                                            | Платно (name-your-price) | Покупка файла, без DRM                                                       | MP3 320/V0, FLAC, ALAC, AAC, Ogg, WAV, AIFF                  | Жив; владелец Songtradr (с 2023)                                                |
| Qobuz Store                                         | Платно                   | Покупка файла, без DRM, навсегда                                             | WAV, AIFF, ALAC, FLAC (до 24/192), MP3 320                   | Жив                                                                             |
| 7digital                                            | Платно                   | DRM-free, но каталог витрины заморожен                                       | MP3, FLAC 16/24                                              | Витрина не обновляется (релизы 2018); компания жива как B2B в составе Songtradr |
| Bleep                                               | Платно                   | Покупка файла, без DRM                                                       | MP3, WAV/FLAC, 24bit WAV                                     | Жив                                                                             |
| Beatport                                            | Платно                   | Покупка файла, без DRM (акцент на DJs)                                       | MP3; lossless WAV/AIFF                                       | Жив (саппорт обновлялся 2026-05)                                                |
| iTunes Store                                        | Платно                   | Покупка файла, без DRM с 2009 (iTunes Plus)                                  | AAC 256 (.m4a)                                               | Жив                                                                             |
| XLD (риппер, macOS)                                 | Инструмент               | Свои CD; бесплатно                                                           | ALAC, FLAC, WAV, MP3 и др.; AccurateRip                      | Жив (обновление 2025-03-02)                                                     |
| Music.app (macOS)                                   | Инструмент               | Свои CD; встроен в ОС                                                        | По умолчанию AAC, кодировщик настраивается; коррекция ошибок | Жив (гайд для macOS Tahoe 26)                                                   |
| EAC (Windows) / whipper (Linux)                     | Инструмент               | Свои CD                                                                      | FLAC; AccurateRip, Test&Copy                                 | Живы (whipper: коммиты 2026-02, релизы редки)                                   |
| beets / Picard                                      | Инструмент               | Open source                                                                  | Теги ID3v2/Vorbis/MP4, переименование, дубликаты             | Живы (beets v2.13.1 2026-07; Picard 2.13.3, активная разработка)                |

Практический короткий список для пользователя macOS (оценка данного исследования):

1. Свои CD -> **XLD**: рип в FLAC с AccurateRip, формат путей «Artist/Year - Album/NN Track»; Music.app оставьте для быстрых рипов в AAC.
2. Покупки -> **Bandcamp** (name-your-price и FLAC одной кнопкой; поддержка артиста) и **Qobuz Store** для крупного каталожного Hi-Res; электроника -> **Bleep**; DJ-треки -> **Beatport**. iTunes Store тоже без DRM (AAC 256).
3. Бесплатно -> **Internet Archive** (концерты, 78rpm, нетлейблы), **Jamendo/FMA/ccMixter** (CC-музыка инди), **Musopen** (классика в общественном достоянии), **Openverse** как поиск по всем CC-каталогам.
4. Порядок -> **beets** (если комфортно с терминалом) или **Picard** (GUI): автотеги из MusicBrainz, обложки, дубликаты.
5. Полученную папку - открыть в нашем плеере: теги и обложки подхватятся `music-metadata` автоматически.

## 7. Что не удалось проверить (не проверено)

- Полная витрина Beatport и Bleep не прочитана автоматическим запросом (Cloudflare/анти-бот защита); форматы подтверждены справкой Beatport и категориями витрины Bleep из поискового индекса сайта, живость - по активности справки/итогам года.
- Точные юридические формулировки Jamendo о лицензиях не извлечены со страницы legal (страница рендерится скриптом); лицензии треков подтверждены через открытые данные Openverse, полученные от провайдера Jamendo.
- Страница тарифов Musopen прочитана через снимок Wayback Machine от 2025-10-18 (живой сайт отдаёт анти-бот страницу); текущие цены могли измениться.
- Список кодировщиков диалога Import Settings в Music.app в текущем гайде Apple явно не перечислен (упоминаются AAC и MP3 Encoder); наличие пункта Apple Lossless Encoder не подтверждено по первоисточнику - для lossless-рипа рекомендуем XLD.
