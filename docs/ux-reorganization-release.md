# Mixed layout candidate, APK17

APK15 UI is restored on Home, Training, Food, Progress and Chat. Home duplicate chat banners are omitted. Profile retains grouped controls, including training/coaches/Ramadan, body/photos and achievements/share cards within Profile itself. /training redirects to /exercises for compatibility. All original features and routes remain.

No data schema, storage, permission, SQL, role, sync or messaging changes. Same package, signer and HTTPS origin.

335 tests pass in UTC and Africa/Cairo. Six-tab visual checks pass at 320/360/390/1280px; opening groups does not change stored fitness data. Native CI verifies legacy APK9, APK15 and APK16 upgrades, IndexedDB photos/media preservation and a fresh offline install.
