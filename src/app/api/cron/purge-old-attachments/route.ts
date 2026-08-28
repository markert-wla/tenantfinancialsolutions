import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const RETENTION_DAYS = 30
const STORAGE_BATCH  = 100

/**
 * GET /api/cron/purge-old-attachments
 *
 * PII safeguard: uploaded files are kept for at most 30 days. This platform is
 * not certified for storing sensitive personal information (tax returns, SSNs,
 * bank statements), so anything clients or coaches upload is purged on a
 * rolling window rather than retained indefinitely.
 *
 * Covers both upload surfaces:
 *   - coach_message_attachments → coach-documents bucket (coach → client)
 *   - client_documents          → client-documents bucket (client → coach)
 *
 * Storage objects are removed first; DB rows are only deleted for batches
 * whose files were successfully removed, so a storage failure never leaves an
 * unreferenced file lingering — the batch is retried on the next run.
 *
 * Vercel Cron always dispatches a GET request — this must stay GET, not POST.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret     = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const cutoff  = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  async function purge(table: string, bucket: string, dateColumn: string) {
    const { data: rows, error } = await service
      .from(table)
      .select('id, file_path')
      .lt(dateColumn, cutoff)

    if (error) return { deleted: 0, failed: 0, error: error.message }

    let deleted = 0
    let failed  = 0

    for (let i = 0; i < (rows ?? []).length; i += STORAGE_BATCH) {
      const batch = rows!.slice(i, i + STORAGE_BATCH)

      const { error: removeErr } = await service.storage
        .from(bucket)
        .remove(batch.map(r => r.file_path))
      if (removeErr) {
        failed += batch.length
        continue
      }

      const { error: deleteErr } = await service
        .from(table)
        .delete()
        .in('id', batch.map(r => r.id))
      if (deleteErr) failed += batch.length
      else           deleted += batch.length
    }

    return { deleted, failed }
  }

  const [messageAttachments, clientDocuments] = await Promise.all([
    purge('coach_message_attachments', 'coach-documents', 'created_at'),
    purge('client_documents', 'client-documents', 'uploaded_at'),
  ])

  const result = { cutoff, messageAttachments, clientDocuments }

  if (messageAttachments.failed || clientDocuments.failed ||
      messageAttachments.error  || clientDocuments.error) {
    console.error('[purge-old-attachments] incomplete purge:', JSON.stringify(result))
  }

  return NextResponse.json(result)
}
