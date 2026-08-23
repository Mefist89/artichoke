# PLAY ROOM ARTICHOKE

Platformă web completă pentru cafeneaua și spațiul de joacă **PLAY ROOM
ARTICHOKE** din Cahul. Aplicația unește într-un singur loc meniul digital,
comenzile, rezervările, sesiunile QR pentru mese și administrarea magazinului.

**Site live:** [artichoke-seven.vercel.app](https://artichoke-seven.vercel.app/)

## Funcționalități

### Pentru clienți

- catalog de produse și prețuri încărcat direct din Supabase;
- coș personal și plasarea securizată a comenzilor;
- formular de rezervare cu alegerea datei, orei și a uneia dintre cele șase mese;
- verificarea unei comenzi după numărul ei;
- ecran public cu starea comenzilor, asemănător ecranelor din restaurante;
- comandă la masă printr-un cod QR temporar;
- pagini pentru servicii, reguli, galerie și contact;
- interfață adaptată pentru telefon, tabletă și desktop;
- temă luminoasă și întunecată.

### Pentru administrator

- autentificare separată și acces permis unui cont marcat ca administrator;
- adăugarea și modificarea produselor, prețurilor și imaginilor;
- încărcarea imaginilor produselor direct de pe calculator în Supabase Storage;
- crearea comenzilor și gestionarea stărilor până la arhivare;
- administrarea celor șase mese și generarea codurilor QR;
- gestionarea rezervărilor într-un calendar zilnic;
- rapoarte pe zi sau perioadă, exportabile în PDF și Excel;
- jurnal pentru modificările administrative și activitatea suspectă.

## Securitate

- prețurile și totalurile comenzilor sunt calculate în baza de date, nu în browser;
- operațiile importante sunt realizate prin funcții RPC și politici RLS;
- conturile administrative sunt păstrate într-o schemă privată;
- Cloudflare Turnstile protejează formularele publice și autentificarea;
- limitarea cererilor este aplicată după sesiunea QR, IP și dispozitiv;
- după două parole greșite apare verificarea Turnstile;
- după cinci încercări greșite, autentificarea este blocată timp de 30 de minute;
- sesiunea administratorului se închide după 30 de minute fără activitate;
- sesiunile QR expiră după maximum două ore și pot fi înlocuite imediat;
- modificările de preț, stare a comenzii și sesiune a mesei sunt auditate;
- aplicația trimite antete HTTP de protecție, inclusiv CSP și HSTS.

## Tehnologii

- [Next.js 16](https://nextjs.org/) și React 19;
- [Supabase](https://supabase.com/) pentru PostgreSQL, Auth și Storage;
- [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) pentru protecția anti-bot;
- [Vercel](https://vercel.com/) pentru build și găzduire;
- pdfmake și write-excel-file pentru exportul rapoartelor;
- qrcode.react pentru codurile QR ale meselor.

## Structura proiectului

```text
public/                 imagini, fonturi și fișiere media
src/app/                pagini și rute server Next.js
src/components/         componentele interfeței
src/lib/                Supabase, anti-spam și exporturi
supabase/migrations/    migrările bazei de date, în ordine cronologică
```

Detaliile despre migrări sunt disponibile în
[supabase/README.md](supabase/README.md).

## Configurare locală

### 1. Instalarea dependențelor

```bash
npm install
```

### 2. Variabilele de mediu

Copiază `.env.example` ca `.env.local` și completează valorile proiectului:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_your_key
SUPABASE_SERVICE_ROLE_KEY=your_private_service_role_key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_private_turnstile_secret_key
ANTI_SPAM_SECRET=at_least_32_random_characters
ADMIN_EMAIL=your_private_admin_email
```

Variabilele `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`,
`ANTI_SPAM_SECRET` și `ADMIN_EMAIL` sunt secrete de server. Nu le salva în Git și
nu le adăuga niciodată cu prefixul `NEXT_PUBLIC_`.

### 3. Configurarea Supabase

Pentru un proiect nou, rulează în Supabase Dashboard → SQL Editor toate fișierele
din `supabase/migrations`, în ordine alfabetică.

După crearea și confirmarea contului în Supabase Auth, marchează-l ca
administrator:

```sql
INSERT INTO private.admin_users (user_id)
SELECT id
FROM auth.users
WHERE lower(email) = lower('EMAILUL_ADMINISTRATORULUI')
ON CONFLICT (user_id) DO NOTHING;
```

Autentificarea pe `/login` folosește loginul `admin` și parola contului configurat
în Supabase Auth. Emailul real este citit numai din variabila de server
`ADMIN_EMAIL`.

### 4. Configurarea Turnstile

Creează în Cloudflare un widget Turnstile pentru domeniul aplicației. Adaugă cheia
publică în `NEXT_PUBLIC_TURNSTILE_SITE_KEY` și cheia secretă în
`TURNSTILE_SECRET_KEY`.

### 5. Pornirea aplicației

```bash
npm run dev
```

Aplicația va fi disponibilă la
[http://localhost:3000](http://localhost:3000).

## Comenzi utile

```bash
npm run dev          # server local pentru dezvoltare
npm run lint         # verificarea codului
npm run build        # build de producție
npm run start        # pornirea build-ului local
npm audit --omit=dev # verificarea dependențelor de producție
```

## Deploy

Proiectul este pregătit pentru Vercel. Adaugă toate variabilele din `.env.example`
în **Project Settings → Environment Variables**, selectează mediul Production și
pornește un nou deploy.

Variabilele `NEXT_PUBLIC_*` sunt incluse în aplicație în timpul build-ului. După
modificarea lor este necesar un nou deploy.
