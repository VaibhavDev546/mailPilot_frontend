# MailPilot (Android frontend)

Personal job-outreach app. React Native + Expo Router + TypeScript. Frontend only; the backend is separate.

## Setup

```bash
npm install
npx expo install --fix
cp .env.example .env
npx expo start --android
```

## Environment

| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_DATA_SOURCE` | `mock` (default, in-memory and empty) or `api` |
| `EXPO_PUBLIC_API_URL` | Backend origin without `/api/v1` or a trailing slash. Android emulator to host machine: `http://10.0.2.2:4000` |

Restart Metro (`npx expo start -c`) after changing `.env`.

In API mode, the app calls `/api/v1` and `/health`, unwraps the backend's `{ data }` responses, and follows pagination. Obtain an access token from `/api/v1/auth/login` and save it under Settings > Backend. The app stores the bearer token in SecureStore; it does not include a login screen.

## Mock mode

- Starts with zero data. Nothing is seeded.
- Lives in memory; resets on app restart.
- Never fakes email delivery or replies. New campaigns show as Queued/Scheduled.
- Gmail connect/disconnect shows an error until a real backend is used.
- Templates: "Add starter templates" on the empty Templates screen creates three editable ones when you tap it.

When `EXPO_PUBLIC_DATA_SOURCE=api`, failures show an error with retry. There is no silent fallback to mock.

## Android testing guide

1. **Emulator:** Android Studio, create a device, `npx expo start --android`.
2. **Physical phone:** install Expo Go, same Wi-Fi, scan the QR. (For notification testing prefer a dev build: `npx expo run:android`.)
3. Smoke test, in order:
   - Settings: save sender name, signature, time zone and sending policy
   - More > Templates: add starter templates
   - Leads: add a lead; try the same email again (duplicate error); set a follow-up date
   - Leads > import/export icon: import a CSV, export it
   - Documents: upload a PDF
   - Campaigns: run the 6-step wizard; tap "Save draft", leave, return and restore it
   - Campaigns > detail: pause, resume, cancel, duplicate
   - Sequences: create with 3 steps, reorder, enroll leads, activate
4. Keyboard: open a long form and confirm fields stay visible. Rotate is locked to portrait.
5. Real backend: set `EXPO_PUBLIC_DATA_SOURCE=api`, run backend, check Settings > Backend shows Reachable.

## Architecture

```
app/                 Expo Router screens
src/repositories/    Repository interface, mock.ts (in-memory), api.ts (REST)
src/services/http.ts fetch wrapper, ApiError, SecureStore token
src/hooks/queries.ts TanStack Query hooks (one per repository call)
src/store/ui.ts      Zustand: lead filters, campaign wizard draft
src/utils/drafts.ts  Expo SQLite: unfinished campaign draft only
src/utils/notifications.ts  local follow-up reminders
```

Server data is never cached in SQLite. Local file URIs are temporary selections for upload only.

## Backend integration

The API repository targets the backend's `/api/v1` routes. It supports leads (including JSON CSV import and server-side export), templates, campaign creation/send/schedule and controls, sequences and enrollment, documents, messages and Gmail threads, notifications, settings, Gmail connection status, and health checks. Backend fields and enum values are mapped to the app's display models.

Authenticated requests use `Authorization: Bearer <access token>`. API responses use `{ data: ... }` (paginated responses also include `meta`); errors use `{ error: { code, message, details? } }`. The canonical route and schema reference is `mailpilot_backend/backend/docs/openapi.yaml`.

Campaign messages are based on backend templates. If a campaign's edited subject or body differs from its selected saved template, the app saves the edited content as a campaign-specific template before creating the campaign. The API does not support editing campaign text independently of a template.

The backend stores document names and files, but does not store the frontend's former document-kind selection. Sequence enrollment is additive; leads cannot be removed from an enrollment in the current backend API. Sequence execution-history and document-download endpoints are not exposed by existing app screens.

Types are in `src/types/index.ts`. Template variables are rendered per recipient by the backend; the app previews them using the same supported variable names.

## Notes

- Package versions are pinned by the frontend manifest. Run `npx expo install --fix` if Expo suggests different ones.
- No app icon is bundled; add `icon` and `android.adaptiveIcon` to `app.json` before release builds.
- Scheduling, sending, reply sync and stop rules run on the backend. The app only submits configuration.
