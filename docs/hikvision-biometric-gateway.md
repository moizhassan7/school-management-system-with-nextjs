# Hikvision DS-K1T342MFX biometric gateway

This ERP uses a local gateway because DS-K1T342MFX terminals normally live on private school LAN addresses. The VPS never connects directly to `192.168.x.x` devices.

## Environment

ERP:

- `BIOMETRIC_CREDENTIAL_KEY`: 32+ character secret used to encrypt Hikvision device passwords. If omitted, `AUTH_SECRET`/`NEXTAUTH_SECRET` is used.

Gateway:

- `ERP_BASE_URL`: public HTTPS origin of the ERP.
- `GATEWAY_KEY_ID`: key issued by `/api/biometric/gateways`.
- `GATEWAY_SECRET`: one-time secret shown when creating the gateway.
- `GATEWAY_DB_PATH`: SQLite queue path.
- `POLL_INTERVAL_MS`: default `60000`.

## Commissioning checklist

1. Create a gateway in the ERP with `POST /api/biometric/gateways` or seed it from an admin session.
2. Copy the returned `keyId` and `secret` into the local gateway `.env`. The secret is only shown once.
3. Install and run the gateway on a machine inside the same LAN as the devices.
4. Add each Hikvision terminal in `/attendance/devices` with its private LAN IP and credentials.
5. Use **Test** from the device dashboard. The gateway probes `/ISAPI/System/deviceInfo` and candidate ISAPI capability endpoints.
6. Assign students/staff from their **Biometric Attendance** tab.
7. Run **Sync users** only after verifying the firmware-supported user APIs on the real device.
8. Run **Sync attendance** or configure polling after event search capability is confirmed.

Raw biometric events are stored separately from calculated attendance. Subject-wise/manual attendance is preserved.
