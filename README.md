# Artichoke Shop

Site Next.js pentru PLAY ROOM ARTICHOKE, conectat la Supabase pentru autentificare, produse, coș, comenzi, mesaje și rezervări.

## Configurare locală

Necesită Node.js și un proiect Supabase configurat cu schema din `supabase_schema.sql`.

1. Instalează dependențele:

   ```bash
   npm install
   ```

2. Copiază `.env.example` ca `.env.local`.

3. Completează în `.env.local` URL-ul proiectului și cheia publishable din Supabase Dashboard → Project Settings → API:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_your_key
   ```

4. În Supabase Dashboard → SQL Editor, rulează integral `supabase_schema.sql`.

5. După ce ai creat și confirmat contul administratorului `jeniabortnic@gmail.com`,
   rulează integral `supabase_admin_dashboard.sql`. Migrarea creează lista privată
   de administratori, politicile RLS și funcțiile necesare panoului `/dashboard`.

6. Pentru bazele configurate anterior, rulează și `supabase_security_hardening.sql`.
   Acesta unește produsele duplicate din coș și activează limitele anti-spam pentru
   formularele publice, fără să modifice produsele sau prețurile.

7. Pornește proiectul:

   ```bash
   npm run dev
   ```

Aplicația va fi disponibilă la [http://localhost:3000](http://localhost:3000).

## Verificări

```bash
npm run lint
npm run build
npm audit --omit=dev
```

Pornirea și build-ul se opresc cu o eroare clară dacă variabilele Supabase lipsesc. Cheia publishable poate fi utilizată în browser; nu adăuga niciodată cheia secretă sau `service_role` în variabile `NEXT_PUBLIC_*`.

## Deploy

În mediul de găzduire, adaugă aceleași două variabile înainte de build. Variabilele `NEXT_PUBLIC_*` sunt incluse de Next.js în bundle în timpul build-ului, deci aplicația trebuie reconstruită după modificarea lor.
