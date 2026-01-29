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
- `JWT_SECRET` - Secret pro JWT tokeny
- `ENCRYPTION_KEY` - Klíč pro šifrování (32 znaků)
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

- ✅ Registrace/Login s JWT autentizací
- ✅ Propojení Google Keep účtu
- ✅ Automatická synchronizace poznámek
- ✅ AI zpracování poznámek (Claude API)
- ✅ Extrakce nápadů s kategorizací
- ✅ Dashboard se statistikami
- ✅ Filtry a fulltext vyhledávání
- ✅ Ruční přidání poznámek a nápadů
- ✅ JSON export dat
- ✅ Dark/Light mode

## API Endpoints

```
/api/auth
├── POST /register, /login, /logout
└── GET  /me

/api/keep
├── POST   /connect
├── DELETE /disconnect
└── POST   /sync

/api/notes
├── GET    /
├── POST   /
├── GET    /:id
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
```

## Deployment

### VPS (Apache + PM2)

1. Nastavte Apache VirtualHost:
```apache
<VirtualHost *:443>
  ServerName keep.muzx.cz
  ProxyPass / http://127.0.0.1:3010/
  ProxyPassReverse / http://127.0.0.1:3010/
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
