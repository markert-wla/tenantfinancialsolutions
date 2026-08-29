import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const RETENTION_DAYS = 30
const STORAGE_BATCH  = 100

/**
 * GET /api/cron/purge-old-attachments
 *
 * Retention rules:
 *   1. Client → coach uploads (client_documents / client-documents bucket) are
 *      deleted 30 days after upload.
 *   2. Coach → client attachments (coach_message_attachments / coach-documents
 *      bucket) have NO expiry — they are kept for as long as the client exists
 *      on TFS.
 *   3. Everything of a client's, in both directions, is destroyed when their
 *      account is deleted — whether they delete it themselves (see
 *      purge-deleted-accounts) or an admin removes them (see
 *      /api/admin/clients/[id]). Nothing here sweeps on that basis.
 *
 * A client with a deletion request pending is left alone until the account is
 * actually deleted, because that request can still be cancelled.
 *
 * Storage objects are removed first; DB rows are only deleted for batches whose
 * files were successfully removed, so a storage failure never leaves an
 * unreferenced file lingering — the batch is retried on the next run.
 *
 * Vercel Cron always dispatches a GET request — this must stay GET, not POST.
 */

type FileRow = { id: string; file_path: string }
type PurgeResult = { deleted: number; failed: number; error?: string }

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret     = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const cutoff  = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  /** Removes the given rows from storage, then from the table. */
  async function removeRows(table: string, bucket: string, rows: FileRow[]): Promise<PurgeResult> {
    let deleted = 0
    let failed  = 0

    for (let i = 0; i < rows.length; i += STORAGE_BATCH) {
      const batch = rows.slice(i, i + STORAGE_BATCH)

      const { error: removeErr } = await service.storage
        .from(bucket)
        .remove(batch.map(r => r.file_path).filter(Boolean))
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

  // ---------------------------------------------------------------------------
  // Client → coach uploads older than the retention window.
  // (Coach → client attachments are intentionally NOT swept by age.)
  // ---------------------------------------------------------------------------
  let clientDocuments: PurgeResult = { deleted: 0, failed: 0 }
  const { data: expiredRows, error: expiredErr } = await service
    .from('client_documents')
    .select('id, file_path')
    .lt('uploaded_at', cutoff)

  if (expiredErr) clientDocuments = { deleted: 0, failed: 0, error: expiredErr.message }
  else            clientDocuments = await removeRows('client_documents', 'client-documents', (expiredRows ?? []) as FileRow[])

  const result = {
    cutoff,
    retentionDays: RETENTION_DAYS,
    clientDocuments,
    coachAttachments: 'retained until the client account is deleted',
  }

  if (clientDocuments.failed || clientDocuments.error) {
    console.error('[purge-old-attachments] incomplete purge:', JSON.stringify(result))
  }

  return NextResponse.json(result)
}
