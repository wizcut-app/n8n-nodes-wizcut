# Automated Podcast Editing Notifications with WizCut

Automate your multicam podcast post-production with WizCut and Slack. This workflow listens for status updates from WizCut's AI editing pipeline and keeps your team in the loop — no manual checking required.

## What it does

WizCut automatically syncs, diarizes, and cuts multicam podcast recordings. This workflow handles what happens after you upload your footage:

1. **Speakers detected** → Slack notification with a direct link to confirm speaker-to-camera mapping (takes ~30 seconds in WizCut's editor)
2. **Mapping confirmed** → Automatically triggers the final render
3. **Render complete** → Slack notification with the download link

You upload your source files through [WizCut's web app](https://wizcut.com), and this workflow automates the rest of the pipeline.

## Who is this for?

- Podcast producers editing multicam recordings
- Production teams who want Slack notifications instead of checking dashboards
- Anyone using WizCut's API who wants automated render triggers

## How to set it up

### Prerequisites

- A [WizCut account](https://wizcut.com) with an API key (find it in Settings)
- A Slack workspace with a channel for notifications (e.g. `#podcast-production`)
- The `@wizcut/n8n-nodes-wizcut` community node installed in your n8n instance

### Steps

1. **Import this workflow** into n8n
2. **Configure the WizCut credential** — paste your API key (starts with `wc_live_`)
3. **Configure the Slack credential** — connect your Slack workspace
4. **Update the Slack channel** — change `#podcast-production` to your channel name
5. **Activate the workflow** — copy the webhook URL from the WizCut Trigger node
6. **Use the webhook URL** — when creating jobs via the WizCut web app or API, paste the webhook URL as the callback URL

### Using the callback URL with the API

When creating a job via the WizCut API, include the webhook URL:

```json
{
  "sources": [{"label": "Camera 1"}, {"label": "Camera 2"}],
  "callbackUrl": "https://your-n8n-instance.com/webhook/wizcut",
  "review": true
}
```

## Customization ideas

- **Replace Slack with Email/Discord/Teams** — swap the Slack nodes for your preferred notification service
- **Add YouTube upload** — after render completes, automatically upload the finished video to YouTube
- **Add transcription** — send the finished video to OpenAI Whisper for show notes and chapters
- **Skip auto-render** — remove the "Start Render" node if you want to review cuts in WizCut's editor before rendering

## Need something different?

If you have specific requirements — like triggering jobs from Google Drive, batch processing a backlog, or integrating with your existing production pipeline — reach out to [WizCut support](mailto:support@wizcut.com). Feature requests are welcome.
