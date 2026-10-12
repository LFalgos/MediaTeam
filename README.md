# Church Website — GitHub + Koyeb

This is an editable static church website with a rotating weekly event banner, monthly calendar, LIVE NOW schedule button, and contact footer.

## Publish on GitHub

1. Create a new repository.
2. Upload all seven files in this folder to the **repository root** (not inside a nested folder).
3. Commit your changes.

## Deploy on Koyeb

1. Open https://app.koyeb.com and create a Web Service from GitHub.
2. Connect your GitHub account and choose your repository and branch.
3. Select the **Dockerfile** builder (Dockerfile in repository root).
4. Set the service's exposed HTTP port to **8000**.
5. Deploy and open the `.koyeb.app` URL shown by Koyeb when healthy.

## Customize

- `index.html`: headings, navigation, address, phone, email, giving and streaming links.
- `styles.css`: fonts, colors, layouts, spacing.
- `live-events.json`: weekly service schedules, event dates, times, timezone.
- `script.js`: calendar and rotation behavior.

This is a sample schedule, not a real-time integration with Google Calendar. The LIVE NOW button reflects scheduled time windows, not actual streaming status. Check the example events and links before publishing.
