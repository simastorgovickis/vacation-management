import { NextResponse } from 'next/server'
import { processMonthlyAccrual } from '@/lib/vacation'
import { headers } from 'next/headers'
import { logger } from '@/lib/logger'

// This endpoint should be protected with a secret token
// Vercel Cron will call this endpoint monthly
export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // In production, verify the cron secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request attempt', { 
        hasAuthHeader: !!authHeader,
        hasSecret: !!cronSecret 
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In development, allow without secret but log a warning
    if (!cronSecret && process.env.NODE_ENV === 'development') {
      logger.warn('CRON_SECRET not set - cron endpoint is unprotected')
    }

    logger.info('Starting monthly accrual process')
    await processMonthlyAccrual()
    logger.info('Monthly accrual process completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Monthly accrual processed successfully',
    })
  } catch (error: unknown) {
    logger.error('Failed to process monthly accrual', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process accrual'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
