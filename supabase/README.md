# Migrări Supabase

Fișierele din `migrations` sunt numerotate cronologic și documentează toate
modificările bazei de date. Nu sunt livrate vizitatorilor și nu trebuie șterse
după rulare.

## Proiect Supabase nou

Rulează toate fișierele din `migrations` în ordine alfabetică, de sus în jos,
folosind Supabase Dashboard → SQL Editor. Fiecare migrare este tranzacțională și
poate fi identificată ușor după numărul și numele ei.

## Proiect existent

Rulează numai migrările care nu au fost aplicate încă. Pentru funcția de
încărcare a imaginilor produselor, ultima migrare necesară este:

`20260823000400_product_images.sql`

Nu combina toate fișierele într-un singur script: păstrarea lor separată face
actualizările mai sigure și permite refacerea bazei într-un mod verificabil.
