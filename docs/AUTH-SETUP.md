# Setup Auth (Google OAuth + Email/Password)

Il codice è già pronto. Per renderlo funzionante in produzione devi configurare due cose lato dashboard:

1. **Supabase** → abilitare i provider e fissare gli URL di redirect.
2. **Google Cloud Console** → creare un OAuth Client che Supabase userà per scambiare il token.

Tempo stimato: 10 minuti. Project ID: `bajsakhtdricpkfwehuk`.

---

## 1) Supabase Dashboard

Vai su https://supabase.com/dashboard/project/bajsakhtdricpkfwehuk/auth/providers

### 1a — Provider Email
- Già abilitato di default.
- **Authentication → Providers → Email**:
  - ✅ "Enable Email provider"
  - ✅ "Confirm email" (consigliato in prod; in dev puoi disattivare per testare più rapidamente)
  - Lascia il template SMTP di default; in prod aggiungerai un SMTP custom (Resend, SendGrid, …).

### 1b — Provider Google
- **Authentication → Providers → Google → Enable**
- Lascia i campi `Client ID` / `Client Secret` vuoti — li compilerai dopo aver creato il client su Google (step 2).
- Annota il "Callback URL (for OAuth)" che ti mostra Supabase, sarà del tipo:
  ```
  https://bajsakhtdricpkfwehuk.supabase.co/auth/v1/callback
  ```
  Ti serve nello step 2.

### 1c — Redirect URLs
- **Authentication → URL Configuration**:
  - `Site URL`: l'URL di produzione (es. `https://blob-party.vercel.app`).
  - `Redirect URLs`: aggiungi **tutte** le origini da cui farai login:
    - `http://localhost:5173` (Vite dev)
    - `http://localhost:5173/auth/callback`
    - `https://<dominio-prod>` e `https://<dominio-prod>/auth/callback`
    - eventuali preview URLs Vercel (es. `https://*.vercel.app/auth/callback`)
  Supabase confronta il `redirectTo` del client con questa lista: se non c'è dentro, blocca il flusso.

---

## 2) Google Cloud Console

Vai su https://console.cloud.google.com/ e seleziona (o crea) il progetto da usare per OAuth.

### 2a — OAuth consent screen
- **APIs & Services → OAuth consent screen**:
  - User type: `External`
  - App name: `Blob Party` (verrà mostrato all'utente sulla schermata di consenso Google)
  - User support email: la tua
  - Developer contact: la tua email
  - Scopes: solo `userinfo.email`, `userinfo.profile`, `openid` (di default OK)
- Salva. In dev puoi lasciare lo stato "Testing"; per prod fai "Publish app".

### 2b — Crea Credenziali OAuth Client
- **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
  - Application type: `Web application`
  - Name: `Blob Party Web Client`
  - **Authorized JavaScript origins**: aggiungi tutte le origini front-end:
    - `http://localhost:5173`
    - `https://<dominio-prod>` (e i preview Vercel se servono)
  - **Authorized redirect URIs**: incolla **il Callback URL di Supabase** che hai annotato allo step 1b (NON l'URL della tua app, ma quello di Supabase):
    - `https://bajsakhtdricpkfwehuk.supabase.co/auth/v1/callback`
- Salva → Google ti dà `Client ID` e `Client Secret`.

### 2c — Incolla credenziali in Supabase
- Torna in **Supabase → Auth → Providers → Google**:
  - Incolla `Client ID`
  - Incolla `Client Secret`
  - Salva.

---

## 3) Verifica

In locale:

```bash
cd gamenight
npm run dev
```

Apri http://localhost:5173, clicca "Accedi" in alto a destra:
- **Email/password**: prova "Crea account" → ricevi un'email di conferma se hai "Confirm email" attivo.
- **Google**: vieni reindirizzato a Google, dai il consenso, torni su `/auth/callback?next=/` e poi sulla home con il blob colorato + display_name in alto a destra.

Dopo il login, su `/profile` vedi le statistiche aggregate e i punteggi migliori (popolati dalla view `user_stats`).

---

## 4) Cosa fa il backend automaticamente

| Evento                          | Effetto                                                                     |
|---------------------------------|-----------------------------------------------------------------------------|
| Sign-up (email o Google)        | Trigger `on_auth_user_created` → crea riga in `public.profiles`             |
| Sign-in successivo              | Client chiama `link_device_to_user(device_id)` → migra score device→user    |
| `submit_score` (qualsiasi gioco)| Se loggato, stampa `user_id` nella riga oltre al `device_id`                |
| Lettura `user_stats`            | Aggrega match_history (party/solo/wins) + best per gioco                    |

Storico partite (`match_history`): la tabella esiste e ha RLS owner-only, ma **NON è ancora popolata** automaticamente al termine di ogni partita. Per registrare una partita chiama `recordMatch({ gameId, mode, ... })` da `src/lib/auth.js` al termine del gioco (es. dentro `endGame` o in `RoundEndScreen`). Da fare in un secondo step quando vorrai i grafici.

---

## 5) Troubleshooting

- **"redirect_uri_mismatch" da Google** → l'URL `https://...supabase.co/auth/v1/callback` non è esattamente nella lista "Authorized redirect URIs" del Google Client. Devono coincidere a caratteri esatti, https incluso.
- **Loop di redirect su `/auth/callback`** → `Redirect URLs` su Supabase non contiene `http://localhost:5173/auth/callback`. Aggiungilo.
- **Email confirmation link 404** → il template usa `{{ .SiteURL }}/auth/confirm?token=...`. Assicurati che `Site URL` punti al dominio reale.
- **`linked_device_ids` vuoto** → la RPC `link_device_to_user` è stata chiamata ma il device non aveva mai inviato uno score. È normale per device nuovi.
