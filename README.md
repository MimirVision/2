# Flipp – AI-skanner for bruktsalg

Ta bilde av en ting, så får du på sekunder:
- **hva den er** (merke, modell, tilstand),
- **hva den selges for brukt** (spenn, typisk pris og pris for raskt salg),
- **ferdige annonser** for Finn.no, Tise, Blocket, Vinted, eBay og flere – på kjøpernes språk,
- **oversikt over fortjeneste** på alt du selger.

Inntektsmodellen er abonnement med hard betalingsmur (ukentlig + årlig) via RevenueCat.

```
app/      Expo/React Native-app (iOS + Android), TypeScript, expo-router
server/   Cloudflare Worker: verdsetting med Claude, abonnement- og kvotesjekk
```

---

## 1. Hvorfor akkurat denne appen (researchen)

**Hva tjener mest penger på App Store i 2026?**

| Funn | Kilde |
|---|---|
| Hard betalingsmur konverterer **10,7 %** av nedlastinger til betalende, mot **2,1 %** for freemium (dag 35). | RevenueCat, *State of Subscription Apps 2026* (115 000 apper, $16 mrd. inntekt) |
| De øverste 10 % av apper vokste MRR med 306 %, nederste kvartil falt 33 %. Tallet på nye abonnementsapper per måned har gått fra ca. 2 000 til ca. 15 000. Middelmådige apper taper, nisjer med tydelig verdi vinner. | RevenueCat 2026 |
| KI-apper tjener **41 % mer per bruker**, men har 30 % høyere frafall. | RevenueCat 2026 (via ppc.land) |
| Foto- og videoapper har høyest andel apper som passerer $1K/mnd (21,4 %). | RevenueCat 2026 |
| **Cal AI** (ta bilde av maten → kalorier) gikk fra 0 til 30–40 MUSD i årlig omsetning på 18 måneder med sju ansatte, og ble kjøpt av MyFitnessPal i 2026. | TechCrunch, Fitt Insider m.fl. |
| **PictureThis** (ta bilde av en plante → navn) omsatte for over 13 MUSD i måneden (mai 2022). | Appfigures |
| Median indie-app tjener under $500/mnd. Toppen tjener på apper som løser et **gjentakende problem** og har tydelig verdi med én gang. | The Swift Kit / RevenueCat |
| Apper på andre språk enn engelsk, spansk, fransk og tysk har lite konkurranse og lite markedsføringskroner. | AppsOps (meningsartikkel) |

**Mønsteret bak vinnerne:** *kamera → KI → umiddelbar «wow»-verdi → onboarding-quiz → hard betalingsmur → ukentlig/årlig abonnement*. Cal AI, PictureThis, Coin ID og Rock ID følger alle denne oppskriften.

**Hvorfor bruktsalg i stedet for kalorier eller planter?**
1. **Appen tjener penger for brukeren.** Betalingsviljen er høyest når appen gir mer enn den koster. Én riktig priset vinterjakke dekker et årsabonnement.
2. **Kaloriskannere er overfylte** (Cal AI/MyFitnessPal, dusinvis av kloner), og plantenisjen eies av PictureThis.
3. **Bruktmarkedet vokser** (Vinted, Tise, Finn), og «thrift flip»-videoer er et stort format på TikTok. Det gir gratis, viral markedsføring der appen vises i hvert klipp.
4. **Norden er dårlig dekket.** De amerikanske bruktskannerne (ResaleScan, Hero, Worthly, Thrift Scanner …) er laget for eBay og engelsk. Ingen skriver gode Finn- og Tise-annonser på norsk eller Blocket-annonser på svensk. Det er vår kile inn, før vi går bredere (eBay/US/UK er allerede støttet).
5. **Gjentakende bruk:** folk selger stadig nye ting, og lageret med fortjenestesporing gir en grunn til å komme tilbake og til å fornye abonnementet.

**Ærlige risikoer:** markedet for bruktskannere vokser og konkurransen øker. Prisene er KI-estimater og ikke live markedsdata (appen sier det, og lenker til lignende annonser). Kjente merkevarer kan få lavere treffsikkerhet på helt ukjente ting. Suksess avhenger mer av markedsføring (TikTok/UGC) enn av koden.

---

## 2. Slik er appen bygget for å tjene penger

- **Onboarding-quiz (7 steg):** land → hva du selger → hvor ofte → markedsplasser → månedlig mål → «planen din er klar». Hvert svar tilpasser appen (valuta, markedsplasser) og bygger forpliktelse før betalingsmuren. Dette er samme oppskrift som Cal AI bruker.
- **Betalingsmur rett etter planen** (RevenueCat Paywalls). Pris, prøveperiode og design styres fra RevenueCat-dashboardet, så du kan A/B-teste **uten ny app-versjon**.
- **1 gratis skann** («aha»-øyeblikket), deretter **hard betalingsmur** håndhevet på serveren. Brukeren kan ikke omgå den ved å endre appen. Grensen per IP stopper misbruk ved å installere appen på nytt.
- **Be om vurdering** (App Store-rating) etter 2. og 10. vellykkede skann, altså rett etter en god opplevelse.
- **Daglig tak for betalende** (`PRO_DAILY_LIMIT`, 40) holder API-kostnaden begrenset.
- **Skann som ikke gir treff trekkes ikke** fra gratiskvoten.

**Anbefalte priser** (sett i App Store Connect + RevenueCat):

| | Norge | USA | Kommentar |
|---|---|---|---|
| Ukentlig | 69 kr | $6.99 | Hovedproduktet for «flippere» |
| Årlig | 449 kr | $39.99 | Vis som «spar 87 %», gjerne med 3 dagers prøveperiode |

Test deretter: årlig med eller uten prøveperiode, og 59 kontra 79 kr i uka.

**Enhetsøkonomi (anslag):** ett skann med Claude Opus 5.5 (bilde ~1,6k tokens inn, ~1,5k ut inkl. tenking) koster omtrent **$0,03–0,05**. En aktiv bruker med 30 skann i måneden koster ca. $1–1,5, mot $25+ i netto inntekt på ukesabonnement. Vil du kutte kostnaden mer, er det én linje å bytte modell i `server/src/appraise.ts` (`MODEL`). Test kvaliteten først.

---

## 3. Kom i gang – steg for steg

### Kontoer du trenger
1. **Apple Developer Program** (99 USD/år): developer.apple.com. Meld deg også inn i *App Store Small Business Program*, så tar Apple 15 % i stedet for 30 %.
2. **Expo/EAS** (gratis å starte): expo.dev. Bygger iOS-appen i skyen, så **du trenger ikke Mac**.
3. **RevenueCat** (gratis opp til $2,5k/mnd i inntekt): app.revenuecat.com.
4. **Anthropic API**: console.anthropic.com. Lag en API-nøkkel.
5. **Cloudflare** (gratis plan holder lenge): dash.cloudflare.com.

### Server
```bash
cd server
npm install
npx wrangler login
npx wrangler kv namespace create QUOTA      # lim inn id-en i wrangler.toml
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put REVENUECAT_SECRET_KEY   # RevenueCat → API keys → Secret key (v1)
npm test && npm run deploy                     # gir deg https://flipp-api.<navn>.workers.dev
```

### RevenueCat + App Store Connect
1. Opprett appen i App Store Connect (bundle-id = `ios.bundleIdentifier` i `app/app.json`, bytt `com.example.flipp` til din egen).
2. Lag to auto-fornybare abonnementer i samme gruppe: `flipp_weekly` og `flipp_yearly`.
3. I RevenueCat: koble til App Store-appen, importer produktene, lag entitlement **`pro`** og knytt begge produktene til den. Lag en *Offering* (`default`) med begge pakkene, og design en **Paywall** på den.

### App
```bash
cd app
npm install
cp .env.example .env        # fyll inn API_URL og RevenueCat public iOS-nøkkel
npm test && npm run typecheck && npx expo lint
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile development --platform ios   # test på din egen iPhone
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios
```
Appen bruker native moduler (RevenueCat, kamera), så den kjører i en **development build**, ikke i Expo Go. Husk å legge `EXPO_PUBLIC_*`-variablene inn som EAS-miljøvariabler for skybyggene.

### Før du sender til App Review
- [ ] Bytt `com.example.flipp`, app-ikon (`app/assets/images/icon.png`, 1024×1024) og splash.
- [ ] Publiser personvernerklæringen (`docs/privacy-policy.md`) og sett `EXPO_PUBLIC_PRIVACY_URL`.
- [ ] Fyll ut App Privacy i App Store Connect: *Photos* (bruksformål: app-funksjonalitet, ikke koblet til identitet, ikke sporing), *Purchase history* og *User ID* (fra RevenueCat).
- [ ] Betalingsmuren må vise pris, periode, vilkår og personvern-lenker (RevenueCat-malene gjør det), og «Gjenopprett kjøp» finnes under Innstillinger.
- [ ] Skjermbilder: bruk et ekte skann av en populær ting (Kånken, Nike, iPhone) og tekst som «Hva er det verdt? Svar på 3 sekunder».

---

## 4. App Store-tekster (ASO)

**Norsk**
- **Navn:** Flipp – Hva er det verdt?
- **Undertittel:** Pris & annonse fra ett bilde
- **Nøkkelord:** finn,tise,bruktpris,selge,brukt,verdi,annonse,vinted,loppis,prisestimat,skanner,arv,dødsbo,flippe
- **Kampanjetekst:** Ta bilde – få bruktprisen og en ferdig Finn-annonse på sekunder.

**Engelsk**
- **Name:** Flipp: Resale Value Scanner
- **Subtitle:** Price & list items from a photo
- **Keywords:** thrift,resale,flip,worth,value,ebay,vinted,depop,reseller,appraisal,price,checker,identify,sell

**Beskrivelse (start):** «Lurer du på hva tingene dine er verdt? Ta et bilde, så forteller Flipp deg hva det selges for brukt, og skriver annonsen for deg, tilpasset Finn.no, Tise, Vinted og eBay.»

---

## 5. Markedsføringsplan (det viktigste for inntekten)

1. **TikTok/Reels/Shorts, 3–5 klipp om dagen** fra flere kontoer: «Jeg skannet alt i boden – her er hva det var verdt», «Loppis-funn til 20 kr selges for 800». Appen er hovedpersonen i hvert klipp. Dette er nøyaktig slik Cal AI vokste.
2. **UGC-skapere:** betal norske og svenske mikroskapere (5–50k følgere innen bruktsalg, interiør og mote) per video, eller gi dem en andel av inntekten.
3. **ASO** på norske søkeord (lite konkurranse) og på engelsk.
4. **Apple Search Ads** på «finn», «tise», «vinted» og «hva er det verdt» når betalingsmuren konverterer over ca. 5 %.
5. **Utvid**: Sverige og Danmark (allerede støttet: Blocket, Tradera, DBA), så UK/US (eBay, Depop).

**Mål å følge (RevenueCat):** nedlasting → prøveperiode/kjøp (mål: over 8 %), prøveperiode → betalt (over 40 %), andel som fornyer årsabonnement.

---

## 6. Veikart (neste versjoner)

- Live sammenligning av priser (web-søk mot Finn/eBay «solgt») som premium-funksjon.
- Flere bilder per ting (forside, bakside, etikett) for bedre treffsikkerhet.
- Fjerne bakgrunn fra produktbilder for penere annonser.
- Svensk og dansk brukergrensesnitt (annonsene skrives allerede på svensk og dansk).
- Varsler: «Tingen din har ligget ute i 7 dager – sett ned prisen til X?»
- Widget og del-utvidelse («Del bilde → Flipp»).

---

## Utvikling

```bash
cd server && npm test && npm run typecheck     # 10 tester
cd app && npm test && npm run typecheck && npx expo lint   # 15 tester
```
Uten RevenueCat-nøkkel kjører appen i utviklermodus: betalingsmuren hoppes over, og serveren gir det antall gratis skann som er satt i `FREE_SCANS`.
