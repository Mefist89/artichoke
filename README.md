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
   SUPABASE_SERVICE_ROLE_KEY=your_private_service_role_key
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
   TURNSTILE_SECRET_KEY=your_private_turnstile_secret_key
   ANTI_SPAM_SECRET=at_least_32_random_characters
   ```

4. În Supabase Dashboard → SQL Editor, rulează integral `supabase_schema.sql`.

Autentificarea administratorului se face pe pagina `/login` cu loginul `admin` și
parola contului administrator creat în Supabase Auth. Parola nu este stocată în
codul aplicației și este verificată direct de Supabase.

5. După ce ai creat și confirmat contul administratorului `jeniabortnic@gmail.com`,
   rulează integral `supabase_admin_dashboard.sql`. Migrarea creează lista privată
   de administratori, politicile RLS și funcțiile necesare panoului `/dashboard`.

6. Pentru bazele configurate anterior, rulează și `supabase_security_hardening.sql`.
   Acesta unește produsele duplicate din coș și activează limitele anti-spam pentru
   formularele publice, fără să modifice produsele sau prețurile.

7. Pentru numerele scurte, crearea și arhivarea comenzilor de către administrator,
   pagina de verificare și ecranul public cu comenzile live, rulează
   `supabase_order_verification.sql`.

8. Pentru cele șase mese, sesiunile QR temporare și comenzile fără autentificare,
   rulează integral `supabase_table_ordering.sql`. Linkurile QR sunt accesibile
   cel mult două ore și numai cât timp administratorul păstrează sesiunea mesei
   deschisă. Rularea din nou a migrării actualizează bazele configurate anterior.

9. Pentru protecția formularelor și jurnalul de activitate suspectă, rulează
   integral `supabase_anti_spam.sql`.

10. În Cloudflare creează un widget Turnstile și permite domeniul
   `artichoke-seven.vercel.app`. Copiază cheia publică în
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY` și cheia secretă în
   `TURNSTILE_SECRET_KEY`. Adaugă în Vercel și cheia `service_role` Supabase,
   plus un secret aleatoriu `ANTI_SPAM_SECRET` de minimum 32 de caractere.

11. Pornește proiectul:

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

Pornirea și build-ul se opresc cu o eroare clară dacă variabilele publice Supabase lipsesc. Cheia publishable poate fi utilizată în browser. `TURNSTILE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` și `ANTI_SPAM_SECRET` trebuie păstrate numai în variabilele serverului și nu trebuie salvate în Git sau adăugate în variabile `NEXT_PUBLIC_*`.

Turnstile este verificat de ruta serverului înainte de prima comandă a unui dispozitiv pentru fiecare QR și înaintea fiecărei rezervări sau trimiteri de contact. Limitele sunt aplicate simultan după QR, IP și dispozitiv. Panoul administratorului afișează încercările blocate din ultimele 24 de ore.

## Deploy

În mediul de găzduire, adaugă toate variabilele din exemplu înainte de build. Variabilele `NEXT_PUBLIC_*` sunt incluse de Next.js în bundle în timpul build-ului, deci aplicația trebuie reconstruită după modificarea lor.
