# n8n-nodes-wizcut

[n8n](https://n8n.io/) community node for [WizCut](https://wizcut.com) — AI-powered multicam podcast editing.

WizCut automatically syncs, diarizes, and cuts multicam podcast recordings. Upload your camera angles, confirm speaker mapping in the WizCut editor, and get a finished video back.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Operations

### WizCut Node

| Operation | Description |
|---|---|
| **Create Job** | Create a new editing job with source files. Returns upload URLs. |
| **Get Job** | Check the current status and details of a job. |
| **Start Processing** | Kick off audio sync and speaker diarization. |
| **Start Render** | Render the final video (after speaker mapping is done in WizCut). |
| **Approve** | Mark a rendered video as approved. |

### WizCut Trigger

Webhook-based trigger that starts your workflow when a job changes status:

| Event | When it fires |
|---|---|
| **Mapping Ready** | Diarization complete. Speakers detected, waiting for you to confirm mapping in the WizCut editor. |
| **Cuts Ready** | Speaker mapping confirmed and cuts generated. Ready for review or render. |
| **Render Complete** | Video rendering finished. |
| **Approved** | Rendered video approved for download. |

## Typical workflow

1. Files land in Google Drive / Dropbox / S3
2. **WizCut: Create Job** — register sources, get presigned upload URLs
3. **HTTP Request** — upload files to the presigned URLs
4. **WizCut: Start Processing** — kicks off sync + diarization
5. **WizCut Trigger** receives `mapping` webhook — send a Slack/email with the review link
6. You confirm speaker mapping in the WizCut editor (takes ~30 seconds)
7. **WizCut Trigger** receives `ready` webhook — trigger render (or review cuts first)
8. **WizCut: Start Render** — render the final video
9. **WizCut Trigger** receives `complete` webhook — download, upload to YouTube, notify team

The human-in-the-loop step (speaker mapping) ensures your podcast always looks right. WizCut does the heavy lifting; you just confirm which camera shows which speaker.

## Credentials

You need a WizCut API key. Get one at [wizcut.com/settings](https://wizcut.com/settings).

API keys start with `wc_live_`.

## Installation

Follow the [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

Search for `n8n-nodes-wizcut` in the community nodes panel, or install manually:

```
npm install n8n-nodes-wizcut
```

## Resources

- [WizCut website](https://wizcut.com)
- [WizCut API docs](https://wizcut.com/docs/api)
- [n8n community nodes docs](https://docs.n8n.io/integrations/community-nodes/)
