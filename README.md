# Keep Brain

AI asistent pro automatické zpracování poznámek z Google Keep - převádí chaotické zápisky na strukturované, kategorizované nápady.

## Architektura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KEEP BRAIN                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │   Next.js    │     │    Redis     │     │   Python     │        │
│  │   Frontend   │◄───►│   + BullMQ   │◄───►│   Worker     │        │
│  │   + API      │     │              │     │  (gkeepapi)  │        │
│  └──────┬───────┘     └──────────────┘     └──────┬───────┘        │
│         │         ┌──────────────┐               │                 │
│         └────────►│  PostgreSQL  │◄──────────────┘                 │
│                   │   (Prisma 7) │                                  │
│                   └──────────────┘                                  │
│         ┌──────────────┐                                            │
│         │  Claude API  │◄─── AI Processing Pipeline                 │
│         └──────────────┘                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Technologie

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma 7
- **Database**: PostgreSQL
- **Queue**: Redis + BullMQ
- **Google Keep**: Python + gkeepapi
- **AI**: Claude API (Anthropic)

## Instalace

### Předpoklady

- Node.js 20+
- Python 3.10+
- PostgreSQL 15+
- Redis

### 1. Klonování a instalace závislostí

```bash
git clone https://github.com/your-username/keep-brain.git
cd keep-brain
npm install
```

### 2. Python worker

```bash
cd worker
python -m venv venv
source venv/bin/activate  # nebo venv\Scripts\activate na Windows
pip install -r requirements.txt
```

### 3. Environment variables

```bash
cp .env.example .env.local
```

Vyplňte hodnoty v `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `ENCRYPTION_KEY` - Klíč pro šifrování (32 znaků)
- `ENCRYPTION_SALT` - Sůl pro derivaci šifrovacího klíče (pro zpětnou kompatibilitu: "salt")
- `ANTHROPIC_API_KEY` - API klíč pro Claude

### 4. Databáze

```bash
npx prisma generate
npx prisma db push
```

### 5. Spuštění

**Development:**
```bash
# Terminal 1 - Next.js
npm run dev

# Terminal 2 - Python worker
cd worker && source venv/bin/activate && python main.py
```

**Production:**
```bash
npm run build
pm2 start ecosystem.config.js
```

## Funkce

- ✅ Registrace/Login s session-based autentizací
- ✅ Propojení Google Keep účtu (OAuth Token, Master Token)
- ✅ Automatická synchronizace poznámek se Server-Sent Events (SSE) pro real-time aktualizace
- ✅ AI zpracování poznámek (Claude + OpenAI)
- ✅ Multi-provider AI settings (vlastní API klíče)
- ✅ Extrakce nápadů s kategorizací
- ✅ Detail poznámky s editací, smazáním a přepracováním
- ✅ Hromadné přepracování ("Zpracovat vse") pro všechny pending/failed poznámky
- ✅ Dashboard s přehledem zpracování, nedávnými poznámkami a klikatelnými kategoriemi
- ✅ Detekce typu obsahu (Instagram, YouTube, odkazy) s filtrováním
- ✅ Záložky kategorií na stránce nápadů s počty a deep links
- ✅ Filtry a fulltext vyhledávání
- ✅ Ruční přidání poznámek a nápadů
- ✅ JSON export dat
- ✅ Dark/Light mode
- ✅ User-friendly error messages pro sync chyby
- ✅ Auth middleware s ochranou všech API a stránek
- ✅ Rate limiting pro login/registraci (10 pokusů / 15 min)
- ✅ Security headers (X-Frame-Options, HSTS, CSP atd.)
- ✅ Zod validace na všech API endpointech
- ✅ Error boundary pro graceful error handling

## Google Keep Sync

### Jak to funguje

1. **Připojení účtu**: Uživatel získá OAuth token nebo master token
2. **Autentizace**: Worker vymění token a ověří přístup ke Google Keep
3. **Synchronizace**: Worker stáhne poznámky z Google Keep
4. **Real-time status**: Frontend přijímá aktualizace přes Server-Sent Events (SSE) během sync

### Metody autentizace

#### OAuth Token (doporučeno)

Primární metoda. Používá Google EmbeddedSetup pro získání OAuth tokenu:

1. Otevřete [accounts.google.com/EmbeddedSetup](https://accounts.google.com/EmbeddedSetup)
2. Přihlaste se do Google účtu
3. Otevřete DevTools (F12) → Application → Cookies
4. Najděte cookie `oauth_token`
5. Zkopírujte hodnotu a vložte do aplikace

**Tip:** Pokud se stránka nenačte, zkuste vypnout ad blocker nebo použijte anonymní okno.

#### Master Token (pro pokročilé)

Pokud už máte master token z jiného nástroje (např. [keep-it-markdown](https://github.com/djsudduth/keep-it-markdown)):

1. Získejte master token pomocí externího nástroje
2. Vložte token přímo do aplikace v nastavení

#### App Password (nefunkční od ledna 2026)

> **POZOR:** Google zrušil podporu App Password autentizace přes endpoint `android.clients.google.com/auth` v lednu 2026. Tato metoda již nefunguje. Použijte OAuth Token nebo Master Token.

### Troubleshooting

| Chyba | Řešení |
|-------|--------|
| `BadAuthentication` | Token expiroval. Odpojte účet a znovu připojte pomocí OAuth Token |
| `UNKNOWN_ERR` | Google odmítl přihlášení. Použijte metodu OAuth Token |
| `NeedsBrowser` | Google vyžaduje ověření přes prohlížeč. Použijte OAuth Token |
| `LoginException` | Přihlášení selhalo. Použijte OAuth Token |
| `Network/Connection error` | Zkontrolujte internet, zkuste později |
| `Rate limit` | Počkejte pár minut a zkuste znovu |

## API Endpoints

```
/api/auth
├── POST /register, /login, /logout
└── GET  /me

/api/keep
├── POST   /connect    (oauthToken | masterToken | appPassword)
├── DELETE /disconnect
├── POST   /sync
└── GET    /sync/status

/api/notes
├── GET    /
├── POST   /
├── POST   /reprocess-all
├── GET    /:id
├── PATCH  /:id
├── DELETE /:id
└── POST   /:id/reprocess

/api/ideas
├── GET    /
├── POST   /
├── GET    /:id
├── PATCH  /:id
└── DELETE /:id

/api/stats
├── GET    /dashboard
└── GET    /export

/api/settings
├── GET    /ai
├── PATCH  /ai
├── GET    /api-key
├── POST   /api-key
└── DELETE /api-key

/api/events
└── GET    /stream    (SSE)
```

## Deployment

### VPS (Apache + PM2)

1. Nastavte Apache VirtualHost:
```apache
<VirtualHost *:443>
  ServerName keep.muzx.cz
  ProxyPass / http://127.0.0.1:3011/
  ProxyPassReverse / http://127.0.0.1:3011/
  SSLEngine on
  SSLCertificateFile /etc/letsencrypt/live/keep.muzx.cz/fullchain.pem
  SSLCertificateKeyFile /etc/letsencrypt/live/keep.muzx.cz/privkey.pem
</VirtualHost>
```

2. Spusťte aplikaci:
```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
```

## Licence

MIT
