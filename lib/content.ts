/**
 * Sitedeki bütün metinler burada. Bir şeyi değiştirmek istediğinde yalnızca bu dosyaya dokunman yeterli.
 * 3D sahneler ve arayüz bu verileri okur; yeni proje/deneyim eklemek için dizilere öğe eklemek yeterli.
 */

export const profile = {
  name: 'Muhammed Furkan Kırcı',
  firstName: 'Furkan',
  initials: 'MFK',
  role: 'Yazılım Mühendisi',
  city: 'Konya',
  email: 'furkankirci12@gmail.com',
  github: { handle: 'FurkanKirci', url: 'https://github.com/FurkanKirci' },
  linkedin: { handle: 'furkankirci', url: 'https://www.linkedin.com/in/furkankirci' },
  board: 'MFK-B26',
  boardRev: 'Rev 1.0',
} as const

export type ChapterId = 'hero' | 'post' | 'kernel' | 'procs' | 'dmesg' | 'trace' | 'shutdown'

export interface Chapter {
  id: ChapterId
  code: string
  cmd: string
  title: string
  line: string
  /** bölümün kaydırma uzunluğu (ekran yüksekliği cinsinden) */
  length: number
  /** menüden atlanınca bölümün neresine inilir (0..1) */
  jump: number
  /** adres çubuğunda kullanılan ad: /#iletisim */
  slug: string
}

export const chapters: Chapter[] = [
  { id: 'hero', code: '0x00', cmd: 'açılış', title: 'Açılış', line: '', length: 1.4, jump: 0, slug: 'acilis' },
  { id: 'post', code: '0x01', cmd: 'POST', title: 'Hakkımda', line: 'Kendini test eden bir sistem.', length: 2.6, jump: 0.62, slug: 'hakkimda' },
  { id: 'kernel', code: '0x02', cmd: 'çekirdek', title: 'Yetenekler', line: 'Açılışta yüklenen modüller.', length: 2.6, jump: 0.36, slug: 'yetenekler' },
  { id: 'procs', code: '0x03', cmd: 'süreçler', title: 'Projeler', line: 'Çalışan her şey bir süreçtir.', length: 3.2, jump: 0.3, slug: 'projeler' },
  { id: 'dmesg', code: '0x04', cmd: 'dmesg', title: 'Deneyim', line: 'Zaman damgalı kayıtlar.', length: 3.4, jump: 0.1, slug: 'deneyim' },
  { id: 'trace', code: '0x05', cmd: 'traceroute', title: 'Yolculuk', line: 'Her şehir bir atlama.', length: 3.4, jump: 0.08, slug: 'yolculuk' },
  { id: 'shutdown', code: '0x06', cmd: 'shutdown', title: 'İletişim', line: 'Kapanmadan önce.', length: 2.8, jump: 0.97, slug: 'iletisim' },
]

/* ------------------------------------------------------------------ açılış */

/** Açılış sinematiğinde ekrana düşen donanım satırları (gerçek bir POST ekranı gibi). */
export const bootLines = [
  { k: 'Kart', v: `${profile.board} ${profile.boardRev} · UEFI 2.9` },
  { k: 'X1', v: '25.000 MHz · kararlı' },
  { k: 'CPU', v: 'MFK-SoC · 6 çekirdek' },
  { k: 'DRAM', v: 'eğitim tamamlandı' },
  { k: 'NVMe', v: 'hazır' },
] as const

/** Gerçek anakartlardaki Q-Code ekranının açılışta gösterdiği kodlar. */
export const postCodes = ['00', '19', '32', '4F', '60', '79', '99', 'A2', 'B2', 'AA'] as const

/* ---------------------------------------------------------------- hakkımda */

export const about = {
  lede: 'Kurumların karmaşık kurallarını; hesaplayan, onaylayan ve raporlayan sistemlere dönüştürüyorum.',
  sub: 'MEDAŞ’ta yazılım mühendisiyim. Arka uçta .NET, önde React, arada hep SQL.',
  selfTest: [
    { k: 'eğitim', v: 'Bilgisayar Mühendisliği · NEÜ · 2019–2024 · AGNO 3.28' },
    { k: 'şimdi', v: 'Yazılım Mühendisi · MEDAŞ · Mart 2026’dan beri' },
    { k: 'sürüyor', v: 'Tezli Yüksek Lisans · NEÜ · 2026 güz dönemi' },
    { k: 'diller', v: 'Türkçe (ana dil) · İngilizce (B1)' },
    { k: 'ilkeler', v: 'Temiz kod · SOLID · Agile' },
  ],
} as const

/* -------------------------------------------------------------- yetenekler */

export interface Core {
  id: number
  key: string
  label: string
  modules: string[]
  notes?: string[]
}

export const cores: Core[] = [
  {
    id: 0,
    key: 'backend',
    label: 'Arka uç',
    modules: ['C#', '.NET 9', 'ASP.NET Core', 'EF Core', 'Java', 'Spring Boot', 'Hibernate', 'Node.js', 'Express'],
    notes: ['Katmanlı mimari, REST API tasarımı', 'Dönemsel hesaplama motorları ve iş kuralları'],
  },
  {
    id: 1,
    key: 'frontend',
    label: 'Arayüz',
    modules: ['React', 'Next.js', 'TypeScript', 'JavaScript', 'Vite', 'Tailwind CSS', 'React Native'],
    notes: ['Sunucu taraflı sayfalanan veri tabloları', 'Yetkiye göre şekillenen menü ve ekranlar'],
  },
  {
    id: 2,
    key: 'data',
    label: 'Veri',
    modules: ['PostgreSQL', 'Oracle', 'SQL Server', 'MySQL', 'MongoDB', 'Firebase'],
    notes: [
      'Pencere fonksiyonları, CTE ve dönemsel bakiye sorguları',
      'EF Core migration’ları, indeks ve sorgu planı okuma',
      'Servisler üzerinden farklı uygulama veritabanlarına erişim',
    ],
  },
  {
    id: 3,
    key: 'infra',
    label: 'Altyapı',
    modules: ['Linux', 'SSH', 'Bash', 'Windows Server', 'IIS', 'GitLab CI/CD', 'Plesk', 'PM2'],
    notes: ['SSH ile sunucuya bağlanıp sistemi sıfırdan ayağa kaldırma', 'main’e push → otomatik derleme ve yayın'],
  },
  {
    id: 4,
    key: 'net',
    label: 'Ağ',
    modules: ['DNS', 'TLS / SSL', 'Reverse proxy', 'HTTP · REST', 'WebSocket', 'Port · firewall'],
    notes: ['Alan adı, sertifika ve yönlendirme ayarları', 'Uygulamalar arası güvenli servis iletişimi'],
  },
  {
    id: 5,
    key: 'integration',
    label: 'Entegrasyon',
    modules: ['e-İmza', 'Servis entegrasyonu', 'JWT · Auth0 · NextAuth', 'PayPal · Stripe', 'Socket.io', 'SheetJS'],
    notes: ['Sağlayıcı geri çağrılarıyla ilerleyen onay akışları', 'Excel dışa aktarım ve raporlama'],
  },
]

/* ---------------------------------------------------------------- projeler */

export type ProcState = 'R' | 'S'

export interface CaseSection {
  h: string
  items: string[]
}

export interface Proc {
  pid: number
  name: string
  title: string
  cmd: string
  state: ProcState
  org: string
  started: string
  cpu: number
  /** ps çıktısında ağaç girintisi için üst süreç */
  parent?: number
  /** köşeli parantezli "çekirdek iş parçacığı" gibi gösterilir */
  kthread?: boolean
  stack: string[]
  insight?: string
  sections?: CaseSection[]
  links?: { label: string; href: string }[]
  featured?: boolean
}

export const procs: Proc[] = [
  {
    pid: 1,
    name: 'furkan',
    title: 'init',
    cmd: 'her şeyin ebeveyni',
    state: 'S',
    org: '',
    started: '2000',
    cpu: 0.1,
    stack: [],
  },
  {
    pid: 2603,
    name: 'medas',
    title: 'MEDAŞ',
    cmd: 'enerji dağıtımı · iç süreç uygulamaları',
    state: 'R',
    org: 'MEDAŞ',
    started: 'Mar 2026',
    cpu: 3.2,
    parent: 1,
    stack: [],
  },
  {
    pid: 2611,
    name: 'prim-hesaplama',
    title: 'Prim hesaplama motoru',
    cmd: 'dönemsel prim, devreden borç, seriler arası mahsup',
    state: 'R',
    org: 'MEDAŞ',
    started: 'Mar 2026',
    cpu: 38.4,
    parent: 2603,
    featured: true,
    stack: ['ASP.NET Core', 'EF Core', 'PostgreSQL', 'React', 'Tailwind CSS', 'SheetJS', 'GitLab CI/CD'],
    insight: 'Bakiye bir toplam değil, bir durumdur.',
    sections: [
      {
        h: 'bağlam',
        items: [
          'Saha süreçlerine bağlı primler her dönem yeniden hesaplanıyor.',
          'İki ayrı fatura serisi, tavan sınırları ve önceki dönemlerden devreden borçlar aynı hesabın içinde.',
        ],
      },
      {
        h: 'kırılma noktası',
        items: [
          'Toplam prim net bir değerdi; önceki borç zaten içine gömülüydü. SUM() yanlış cevaptı.',
          'Doğru bakiye, her kişi ve seri için son dönemin değeriydi. Sorgular buna göre yeniden kuruldu.',
        ],
      },
      {
        h: 'algoritma',
        items: [
          'Seri bazında brüt → havuz (brüt + devreden borç) → tavandan önce seriler arası açık transferi → tavan.',
          'Net prim = max(havuz, 0); kalan borç havuz negatifse onun mutlak değeri.',
          'Borç durumu her değiştiğinde, kapanış dahil, bakiye satırı yazılıyor; geçmiş yeniden üretilebilir.',
          'Diğer seriden kapanan borç için sentetik satır; yuvarlama tek noktada, tek kuralla.',
        ],
      },
      {
        h: 'sonuç',
        items: [
          'Çift sayılan borç ve seriler arası mahsup hataları giderildi.',
          'Borç bakiyesi sorgulama ekranı, genişleyebilir satırlı ve sunucu taraflı sayfalanan tablolarla canlıda.',
        ],
      },
    ],
  },
  {
    pid: 2612,
    name: 'hakedis-onay',
    title: 'Hakediş ve e-imza onay akışı',
    cmd: 'sözleşmeye bağlı, çok adımlı e-imza',
    state: 'R',
    org: 'MEDAŞ',
    started: 'Mar 2026',
    cpu: 21.7,
    parent: 2603,
    featured: true,
    stack: ['ASP.NET Core', 'EF Core', 'PostgreSQL', 'Oracle', 'React', 'e-İmza', 'GitLab CI/CD'],
    insight: 'Her imza bir durum geçişidir.',
    sections: [
      {
        h: 'akış',
        items: [
          'Sözleşmede tanımlı onaycılar sırayla imzalar; ardından mali onay ve tamamlanma.',
          'Her adım; sıra, onaycı ve durumla tutulur. Kim, neyi, ne zaman onayladı sorusunun tek bir cevabı var.',
        ],
      },
      {
        h: 'entegrasyon',
        items: [
          'İmzalar e-imza sağlayıcısından geri çağrı (callback) olarak gelir ve kod + e-posta eşleşmesiyle doğru adıma bağlanır.',
          'Mobil hakediş: açma-kesme gibi saha işlemlerinden Oracle sorgularıyla hakediş verisi üretilir.',
        ],
      },
      {
        h: 'veri sahipliği',
        items: [
          'Başka bir uygulamanın tablolarını doğrudan okumak yerine, o uygulamanın sunduğu servisle konuşmak.',
          'Veri nerede doğuyorsa sözleşme orada tanımlanır; uygulamalar birbirinin şemasına bağımlı kalmaz.',
        ],
      },
    ],
  },
  {
    pid: 2613,
    name: 'pdks',
    title: 'PDKS',
    cmd: 'personel devam kontrol · web + mobil',
    state: 'R',
    org: 'MEDAŞ',
    started: '2026',
    cpu: 17.9,
    parent: 2603,
    featured: true,
    stack: ['.NET 9', 'React', 'Vite', 'PostgreSQL', 'IIS', 'Windows Server', 'GitLab CI/CD'],
    insight: 'main’e push, gerisi otomatik.',
    sections: [
      {
        h: 'mimari',
        items: [
          '.NET 9 ile katmanlı mimari; React (Vite) arayüz ve mobil istemci.',
          'API ve arayüz tek IIS sitesi altında; PostgreSQL ayrı bir sunucuda.',
        ],
      },
      {
        h: 'yayın hattı',
        items: [
          'GitLab CI/CD: main dalına her push, sunucudaki runner ile derlenip yayına alınıyor.',
          'Uygulama yeni bir sunucuya taşındı; runner ve yayın hattı sıfırdan kuruldu.',
        ],
      },
    ],
  },
  {
    pid: 2614,
    name: 'veri-köprüsü',
    title: 'Uygulamalar arası veri köprüsü',
    cmd: 'farklı uygulama veritabanlarından servisle veri',
    state: 'S',
    org: 'MEDAŞ',
    started: '2026',
    cpu: 4.1,
    parent: 2603,
    kthread: true,
    stack: ['Oracle', 'PostgreSQL', 'REST'],
  },
  {
    pid: 2615,
    name: 'ci/cd',
    title: 'Sürekli entegrasyon',
    cmd: 'elektrik dağıtımındaki tüm uygulamalar GitLab CI/CD ile',
    state: 'S',
    org: 'MEDAŞ',
    started: '2026',
    cpu: 2.6,
    parent: 2603,
    kthread: true,
    stack: ['GitLab CI/CD', 'GitLab Runner', 'IIS'],
  },
  {
    pid: 2408,
    name: 'egitim-erp',
    title: 'Dil okulu ERP’si',
    cmd: 'öğrenciden bordroya, uçtan uca okul yönetimi',
    state: 'S',
    org: 'Rheinland Privatschule',
    started: 'Ağu 2024',
    cpu: 0.0,
    parent: 1,
    featured: true,
    stack: ['Java', 'Spring', 'Hibernate', 'JSP', 'Next.js', 'Express', 'MySQL', 'Socket.io', 'PayPal', 'Plesk'],
    insight: 'On bir modül, tek bir okul.',
    sections: [
      {
        h: 'modüller',
        items: [
          'Öğrenciler, öğretmenler ve acenteler · canlı dersler · sistem kullanıcıları ve yetkiler',
          'Personel ve maaşlar · ders kayıtları ve fiyatlar · dışarıdan öğrenci kaydı',
          'Canlı mesajlaşma uygulaması · telc sınav sistemi',
        ],
      },
      {
        h: 'telc sınav sistemi',
        items: [
          'Yönetici, okul, okul çalışanı ve öğrenci rolleri.',
          'Sınavlar okullara dağıtılır, okullar tarih belirler, öğrenciler kayıt olup PayPal ile öder.',
        ],
      },
      {
        h: 'dönüşüm',
        items: [
          'Java/JSP/HTML tabanlı projelerde %80 performans artışı.',
          'Next.js’e geçiş: SEO ve REST API entegrasyonu.',
          'Canlı mesajlaşma Socket.io ile gerçek zamanlı ve dosya paylaşımlı.',
          'IONOS sunucuları SSH ve Plesk ile yönetildi.',
        ],
      },
    ],
    links: [{ label: 'almanca.at', href: 'https://almanca.at/courseTypeSelectionGER' }],
  },
  {
    pid: 2409,
    name: 'telc-sinav',
    title: 'telc sınav kayıt sistemi',
    cmd: 'okullara sınav dağıtımı, kayıt ve ödeme',
    state: 'S',
    org: 'Rheinland Privatschule',
    started: '2024',
    cpu: 0.0,
    parent: 2408,
    stack: ['Next.js', 'Java', 'Spring', 'Hibernate', 'MySQL', 'PayPal'],
  },
  {
    pid: 2410,
    name: 'mesajlasma',
    title: 'Canlı mesajlaşma',
    cmd: 'gerçek zamanlı sohbet ve dosya paylaşımı',
    state: 'S',
    org: 'Rheinland Privatschule',
    started: '2024',
    cpu: 0.0,
    parent: 2408,
    stack: ['Next.js', 'Java', 'Spring', 'Socket.io', 'MySQL'],
  },
  {
    pid: 1874,
    name: 'ilac-takip',
    title: 'Mobil ilaç takip',
    cmd: 'kullanım saati, sıklık, süre ve amaç takibi',
    state: 'S',
    org: 'Pengona',
    started: 'Play Store',
    cpu: 0.0,
    parent: 1,
    featured: true,
    stack: ['React Native', 'Context API', 'Node.js', 'MongoDB', 'Firebase', 'JWT'],
    insight: 'Doğru saatte, doğru ilaç.',
    sections: [
      {
        h: 'uygulama',
        items: [
          'İlaçların kullanım saatleri, sıklığı, süresi ve kullanım amacı tek bir yerde.',
          'React Native ile tek kod tabanı; JWT ile kimlik doğrulama, Firebase ve MongoDB ile veri.',
        ],
      },
    ],
    links: [{ label: 'Google Play', href: 'https://play.google.com/store/apps/details?id=com.pengona.medicineapp' }],
  },
  {
    pid: 1652,
    name: 'pengona',
    title: 'E-ticaret platformu',
    cmd: 'katalog, sepet, ödeme, kullanıcı yönetimi',
    state: 'S',
    org: 'Pengona',
    started: 'yayında',
    cpu: 0.0,
    parent: 1,
    stack: ['Next.js', 'Node.js', 'MongoDB', 'Stripe', 'Tailwind CSS'],
    links: [{ label: 'pengona.com', href: 'https://pengona.com' }],
  },
  {
    pid: 1903,
    name: 'cncnova',
    title: 'CNC Nova',
    cmd: 'CNC makineleri için e-ticaret + ERP (beta)',
    state: 'S',
    org: '',
    started: 'beta',
    cpu: 0.0,
    parent: 1,
    stack: ['Next.js', 'MongoDB'],
    links: [{ label: 'cncnova.com', href: 'https://cncnova.com' }],
  },
  {
    pid: 1911,
    name: 'guzellik-cms',
    title: 'Güzellik salonu sitesi',
    cmd: 'panelden yönetilen içerik, JWT ile yetki',
    state: 'S',
    org: '',
    started: 'yayında',
    cpu: 0.0,
    parent: 1,
    stack: ['Next.js', 'MongoDB', 'JWT'],
    links: [{ label: 'çankayagüzellik.com', href: 'https://www.çankayagüzellik.com' }],
  },
  {
    pid: 2677,
    name: 'futboltahmin',
    title: 'FutbolTahmin',
    cmd: 'maç tahmini · geliştiriliyor',
    state: 'R',
    org: 'kişisel',
    started: '2026',
    cpu: 6.3,
    parent: 1,
    stack: ['MongoDB Atlas'],
  },
  {
    pid: 2610,
    name: 'portfolio',
    title: 'Bu site',
    cmd: 'açılıştan kapanışa bir bilgisayar',
    state: 'R',
    org: 'kişisel',
    started: 'Eki 2026',
    cpu: 11.0,
    parent: 1,
    stack: ['Next.js', 'three.js', 'React Three Fiber', 'GLSL', 'Web Audio'],
    links: [{ label: 'kaynak kod', href: 'https://github.com/FurkanKirci/portfolio' }],
  },
]

export const featuredProcs = procs.filter((p) => p.featured)

/* ---------------------------------------------------------------- deneyim */

export interface Channel {
  id: string
  label: string
  role: string
  org: string
  place: string
  /** ondalık yıl (2024.6 = Ağustos 2024 civarı) */
  from: number
  to: number | null
  range: string
  lines: string[]
  /** dmesg satırları için tarih etiketi */
  upStamp: string
  downStamp?: string
  upMsg: string
  downMsg?: string
}

export const timeline = {
  start: 2019.45,
  end: 2026.95,
  now: 2026.77,
}

export const channels: Channel[] = [
  {
    id: 'neu0',
    label: 'lisans',
    role: 'Bilgisayar Mühendisliği',
    org: 'Necmettin Erbakan Üniversitesi',
    place: 'Konya',
    from: 2019.7,
    to: 2024.5,
    range: '2019 — 2024',
    lines: ['İngilizce hazırlık + Bilgisayar Mühendisliği', 'AGNO 3.28'],
    upStamp: '2019',
    downStamp: '2024',
    upMsg: 'bağlandı — Bilgisayar Mühendisliği, İngilizce hazırlıkla',
    downMsg: 'mezuniyet — AGNO 3.28',
  },
  {
    id: 'aselsan0',
    label: 'staj',
    role: 'Yazılım Tasarım ve BT Stajyeri',
    org: 'ASELSAN Konya Silah Sistemleri',
    place: 'Konya',
    from: 2023.7,
    to: 2024.42,
    range: '2023 — 2024',
    lines: [
      'C#, .NET ve SQL ile kurum içi uygulamalar',
      'React, Node.js ve MongoDB ile ERP’ye 4 yeni modül',
      'PM2 ile yayın, teknik dokümantasyon',
    ],
    upStamp: '2023',
    downStamp: '2024',
    upMsg: 'bağlandı — yazılım tasarım ve BT stajı',
    downMsg: 'ayrıldı — ERP’ye 4 yeni modül',
  },
  {
    id: 'rheinland0',
    label: 'full stack',
    role: 'Full Stack Developer',
    org: 'Rheinland Privatschule',
    place: 'Düsseldorf · uzaktan',
    from: 2024.6,
    to: 2025.79,
    range: 'Ağustos 2024 — Ekim 2025',
    lines: [
      'Okulun ERP’si: öğrenciden bordroya on bir modül',
      'Java/JSP projelerinde %80 performans artışı, Next.js’e geçiş',
      'telc sınav sistemi ve canlı mesajlaşma',
    ],
    upStamp: '2024-08',
    downStamp: '2025-10-17',
    upMsg: 'bağlandı — Full Stack Developer, uzaktan',
    downMsg: 'ayrıldı',
  },
  {
    id: 'ogretmen0',
    label: 'öğretmenlik',
    role: 'Ücretli Öğretmen',
    org: 'Lise',
    place: 'İstanbul',
    from: 2025.8,
    to: 2026.15,
    range: 'Ekim 2025 — Şubat 2026',
    lines: ['İstanbul’da bir lisede ücretli öğretmen.'],
    upStamp: '2025-10-20',
    downStamp: '2026-02-24',
    upMsg: 'bağlandı — ücretli öğretmen, İstanbul',
    downMsg: 'ayrıldı',
  },
  {
    id: 'medas0',
    label: 'MEDAŞ',
    role: 'Yazılım Mühendisi',
    org: 'MEDAŞ',
    place: 'Konya',
    from: 2026.17,
    to: null,
    range: 'Mart 2026 — bugün',
    lines: [
      'Prim hesaplama, hakediş ve e-imza onay akışları, PDKS (web + mobil)',
      'Farklı uygulamaların veritabanlarından servislerle veri entegrasyonu',
      'Bütün uygulamalar GitLab CI/CD ile canlıda',
    ],
    upStamp: '2026-03-02',
    upMsg: 'bağlandı — Yazılım Mühendisi, Konya',
  },
  {
    id: 'neu1',
    label: 'yüksek lisans',
    role: 'Bilgisayar Mühendisliği · Tezli YL',
    org: 'Necmettin Erbakan Üniversitesi',
    place: 'Konya',
    from: 2026.7,
    to: null,
    range: '2026 güz — sürüyor',
    lines: ['İlk dönem; tez alanı henüz belirlenmedi.'],
    upStamp: '2026-09',
    upMsg: 'bağlandı — tezli yüksek lisans',
  },
]

/* --------------------------------------------------------------- yolculuk */

export interface Hop {
  n: number
  host: string
  city: string
  lat: number
  lon: number
  year: string
  note: string
  remote?: boolean
}

export const hops: Hop[] = [
  { n: 1, host: 'elazig', city: 'Elazığ', lat: 38.6748, lon: 39.2225, year: '2000', note: 'başlangıç' },
  { n: 2, host: 'konya', city: 'Konya', lat: 37.8746, lon: 32.4932, year: '2019', note: 'NEÜ · lisans · ASELSAN stajı' },
  { n: 3, host: 'istanbul', city: 'İstanbul', lat: 41.0082, lon: 28.9784, year: '2024', note: 'Rheinland, uzaktan' },
  { n: 4, host: 'duesseldorf', city: 'Düsseldorf', lat: 51.2277, lon: 6.7735, year: '2024', note: 'tünel · yanıt yok', remote: true },
  { n: 5, host: 'istanbul', city: 'İstanbul', lat: 41.0082, lon: 28.9784, year: '2025', note: 'öğretmenlik' },
  { n: 6, host: 'konya', city: 'Konya', lat: 37.8746, lon: 32.4932, year: '2026', note: 'MEDAŞ · yüksek lisans' },
]

/* --------------------------------------------------------------- iletişim */

export const shutdownLog = [
  'Durduruldu: pdks.service',
  'Durduruldu: hakedis-onay.service',
  'Durduruldu: prim-hesaplama.service',
  'Ayrıldı: /home/furkan',
  'Ulaşıldı: kapanış hedefi',
] as const

export const contact = {
  heading: 'Bir mesaj bırak.',
  note: 'Telefon ve referanslar istek üzerine.',
  formOk: 'Mesaj kuyruğa alındı. En kısa sürede dönüş yapacağım.',
  formFail: 'Gönderilemedi. Doğrudan e-posta atabilirsin.',
} as const

/* ------------------------------------------------------------ küçük şakalar */

export const commands: Record<string, string> = {
  whoami: 'furkan',
  uname: `${profile.board} 6.6.0-furkan #1 SMP PREEMPT_DYNAMIC Konya x86_64`,
  sudo: 'furkan sudoers dosyasında yok. Bu olay raporlanacak.',
  pwd: '/home/furkan/portfolio',
  ls: 'hakkimda  yetenekler  projeler  deneyim  yolculuk  iletisim',
  uptime: '__uptime__',
  exit: 'logout? Burası zaten ana sayfa.',
  vim: 'Çıkmak için :q! … şaka, ESC yeter.',
  ping: '64 bytes from furkan: icmp_seq=1 ttl=64 time=0.042 ms',
  date: '__date__',
  help: 'whoami · uname · uptime · ls · ping · sudo · reboot · shutdown',
}
