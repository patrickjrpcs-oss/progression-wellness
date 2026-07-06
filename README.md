# Progression Wellness V1 PWA

This is a local-first Progression Wellness prototype rebuilt around the real V1 standard:

> The app should feel like texting John, with tools quietly behind the conversation.

## What changed

- Chat is now the home screen.
- Daily Log, Timeline, Playbook, and Data are hidden in a side panel.
- John uses a small local companion engine instead of only hardcoded keyword replies.
- Natural messages quietly update the daily log.
- Timeline entries are created from conversation.
- Playbook cards can be learned from conversation.
- Local data is stored in IndexedDB.
- Export/import JSON supports phone-to-PC testing.

## Run from your PC

From this folder:

```powershell
py -3.11 -m http.server 8080
```

Open on PC:

```text
http://localhost:8080
```

## Open from your phone on the same Wi-Fi

Find your PC IPv4 address:

```powershell
ipconfig
```

Then open this on your phone:

```text
http://YOUR-PC-IP:8080
```

Use Add to Home Screen from the phone browser.

## Transfer data from phone to PC

On phone:

1. Open Progression.
2. Tap the menu.
3. Open Data.
4. Export JSON.

On PC:

1. Open the app.
2. Tap the menu.
3. Open Data.
4. Import JSON.

## Important V1 limitation

This is still local-only and rule-based. It does not call a real AI backend yet. The local John engine exists so we can test the feeling of the product before wiring in a live model.
