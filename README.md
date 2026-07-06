# Progression Wellness V1 PWA

This is a local-first Version 1 PWA prototype.

## What it includes

- Installable PWA shell
- Phone-friendly layout
- Local IndexedDB storage
- Export Data button
- Import Data button
- One coach chat with John
- Daily log
- Timeline
- Playbook
- Offline service worker cache

## Run from your PC

From this folder, run a simple local server:

```powershell
py -3.11 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Open from your phone on the same Wi-Fi

On your PC, find your local IP address:

```powershell
ipconfig
```

Look for your IPv4 address, then open this on your phone:

```text
http://YOUR-PC-IP:8080
```

Example:

```text
http://192.168.1.25:8080
```

Then use Add to Home Screen from your phone browser.

## Transfer phone data back to PC

On phone:

1. Open Progression.
2. Go to Data.
3. Tap Export Data.
4. Send the JSON file to your PC.

On PC:

1. Open the app.
2. Go to Data.
3. Tap Import Data.
4. Choose the exported JSON file.
