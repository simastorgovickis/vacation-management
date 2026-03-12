import { logger } from '@/lib/logger'

const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim()

export async function postToSlackChannel(text: string) {
  if (!webhookUrl) {
    logger.warn('Slack notification not sent: SLACK_WEBHOOK_URL is not configured')
    return
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.error('Slack webhook request failed', { status: res.status, body })
    }
  } catch (error) {
    logger.error('Failed to post Slack webhook', { error })
  }
}

