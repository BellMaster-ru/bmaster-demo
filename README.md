# BMaster Demo (Client-side Mock Backend)

Frontend demo runs without a real server: all `/api/*` calls and `/api/queries/stream` WebSocket are emulated in browser.
Before entering the app, a blocking warning modal explains that this is a limited demo.

## Run

```bash
npm run dev
```

## Demo Login

Service mode is enabled by default.

- Login: `root`
- Password: `bmaster`

## Data Storage

- Mock state (accounts, school, settings, metadata): `localStorage`
- Sound files: `IndexedDB`

Runtime processes (active playback/stream sessions/timers) are reset on page reload.

## Simplified Scheduler

- In demo mode, a built-in scheduler checks school assignments each second.
- It queues lesson start/end sounds from the active schedule for the current weekday.
- It respects:
  - `school/overrides` (`mute_all_lessons`, `mute_lessons`)
  - `lite/bells` global enable + weekday switches
  - per-lesson disable in `lite/bells/lessons`

## Reset Demo State

In Settings page:

- Use `Сбросить демо-данные` button.

Or in browser console:

```js
await window.__bmasterMock?.reset();
```

This resets seed data, clears sound blobs, and removes auth token.
