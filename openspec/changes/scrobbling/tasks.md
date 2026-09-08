# Tasks: scrobbling

## 1. API client and token

- [x] 1.1 `src/scrobbling/api.ts`: typed wrappers for `POST /1/submit-listens` and `GET /1/validate-token` (token header, JSON, error typing incl. 429/Retry-After); token persisted in localStorage on successful validation, removable. Verify: `npm run typecheck` green.
- [x] 1.2 Control-bar button + popup (equalizer-popup pattern): token input, Connect -> validate -> status line, enable toggle, disconnect. Verify: `npm run build` green.

## 2. Listen tracking

- [x] 2.1 Listen tracking on the player's existing event stream: furthest-position tracking with completion settle at source transitions (track switch, natural-end wrap); no AudioPlayer changes needed. Verify: `npm run typecheck` green.
- [x] 2.2 `src/scrobbling/listens.ts`: playing-now submission on library track play with >= 1s throttle; completion rule (>= 50% duration or >= 240s) on switch and natural end. Verify: `npm run typecheck` green.

## 3. Queue and retries

- [x] 3.1 IndexedDB v6 with `listens` store (auto-increment key); failed completed-listen submissions enqueue with metadata + submitted-at. Verify: `npm run typecheck` green.
- [x] 3.2 Submission serializer: max one in-flight request, >= 1.1s spacing, 429/Retry-After re-queues; drain on `online`, after each success, and at boot; queue survives reloads. Verify: `npm run build` green.

## 4. Spec tests

- [x] 4.1 Spec scenarios to e2e tests (Playwright API mocks): connect valid/invalid token; playing-now on play; throttled rapid switching; completed listen past threshold (2s test wav, seek past half); no listen when skipped early; failed submit queues and retries on `online`; rate spacing between queued submits. Verify: `npm run test:e2e` green.

## 5. Verification

- [x] 5.1 Full matrix `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
- [ ] 5.2 Manual pass with a REAL ListenBrainz account: connect, play tracks to completion, verify listens appear in the ListenBrainz profile; toggle off -> no submissions; offline queue drains on reconnect. Verify: checklist noted in the change summary.
