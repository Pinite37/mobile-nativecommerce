# Deep links (aximarketplace.com)

Objectif : partager des URLs `https://aximarketplace.com/p/<productId>` qui ouvrent l'app automatiquement (Universal Links iOS + App Links Android).

## Côté app (déjà fait dans ce repo)

- iOS : `associatedDomains` = `applinks:aximarketplace.com` (+ www)
- Android : `intentFilters` `https://aximarketplace.com/p/*` (+ www), `autoVerify: true`
- Partage : utilise `EXPO_PUBLIC_WEB_URL` (par défaut `https://aximarketplace.com`) via `utils/AppLinks.ts`

## Côté domaine (à faire sur ton serveur)

Tu dois héberger 2 fichiers JSON, **sans redirection**, accessibles publiquement :

### 1) iOS Universal Links

URL : `https://aximarketplace.com/.well-known/apple-app-site-association`

- Contenu : basé sur `docs/deeplinks/apple-app-site-association.template`
- **Remplace `__APPLE_TEAM_ID__`**
  - Tu le trouves dans Apple Developer / App Store Connect (Team ID)
- Headers : `Content-Type: application/json`
- Pas d'extension `.json`

### 2) Android App Links

URL : `https://aximarketplace.com/.well-known/assetlinks.json`

- Contenu : basé sur `docs/deeplinks/assetlinks.json.template`
- **Remplace `__REPLACE_WITH_YOUR_SHA256_CERT_FINGERPRINT__`**
  - Si tu utilises **Play App Signing** : prends le SHA-256 de la clé de signature (Play Console → App integrity)
  - Sinon : `keytool -list -v -keystore <keystore> -alias <alias>`
- Headers : `Content-Type: application/json`

## Vérification rapide

- iOS : `https://aximarketplace.com/.well-known/apple-app-site-association` doit répondre 200 (pas 301/302)
- Android : `https://aximarketplace.com/.well-known/assetlinks.json` doit répondre 200

## Notes importantes

- WhatsApp/SMS cliquent beaucoup mieux sur `https://...` que sur `axiapp://...`.
- Sans les 2 fichiers `.well-known`, les liens `https://aximarketplace.com/p/...` s'ouvriront dans le navigateur au lieu de l'app.
