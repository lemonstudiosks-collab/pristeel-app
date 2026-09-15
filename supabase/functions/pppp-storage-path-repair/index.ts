import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const EXPECTED_GOOD_COUNTS: Record<string, number> = {
  'expense-receipts': 9,
  'project-source-files': 597,
}

const DELETE_CONFIRMATION = 'DELETE_PREFIXED_DUPLICATES_606'

type ListedFile = {
  path: string
  metadata: Record<string, unknown>
}

function metadataValue(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key]
    if (value !== undefined && value !== null) return String(value)
  }
  return null
}

async function listAllFiles(bucket: string): Promise<ListedFile[]> {
  const storage = supabase.storage.from(bucket)
  const queue = ['']
  const visited = new Set<string>()
  const files: ListedFile[] = []

  while (queue.length) {
    const prefix = queue.shift()!
    if (visited.has(prefix)) continue
    visited.add(prefix)

    let offset = 0
    while (true) {
      const { data, error } = await storage.list(prefix, {
        limit: 1000,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (error) throw new Error(`list failed for ${bucket}/${prefix}: ${error.message}`)
      const entries = data ?? []

      for (const item of entries) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name
        if (item.id === null) {
          queue.push(fullPath)
        } else {
          files.push({
            path: fullPath,
            metadata: (item.metadata ?? {}) as Record<string, unknown>,
          })
        }
      }

      if (entries.length < 1000) break
      offset += entries.length
    }
  }

  return files
}

function analyzeFiles(bucket: string, files: ListedFile[]) {
  const expectedGood = EXPECTED_GOOD_COUNTS[bucket]
  const badPrefix = `${bucket}/`
  const byPath = new Map(files.map((file) => [file.path, file]))
  const badFiles = files.filter((file) => file.path.startsWith(badPrefix))
  const goodCount = files.length - badFiles.length
  const mismatches: Array<Record<string, unknown>> = []
  const deletable: string[] = []

  for (const bad of badFiles) {
    const goodPath = bad.path.slice(badPrefix.length)
    const good = byPath.get(goodPath)
    if (!good) {
      mismatches.push({ bad: bad.path, good: goodPath, reason: 'missing_counterpart' })
      continue
    }

    const badSize = metadataValue(bad.metadata, 'size', 'contentLength')
    const goodSize = metadataValue(good.metadata, 'size', 'contentLength')
    const badEtag = metadataValue(bad.metadata, 'eTag', 'etag')
    const goodEtag = metadataValue(good.metadata, 'eTag', 'etag')

    if (!badSize || !goodSize || badSize !== goodSize) {
      mismatches.push({ bad: bad.path, good: goodPath, reason: 'size_mismatch', badSize, goodSize })
      continue
    }
    if (!badEtag || !goodEtag || badEtag !== goodEtag) {
      mismatches.push({ bad: bad.path, good: goodPath, reason: 'etag_mismatch_or_missing', badEtag, goodEtag })
      continue
    }

    deletable.push(bad.path)
  }

  const safe =
    goodCount === expectedGood &&
    mismatches.length === 0 &&
    deletable.length === badFiles.length

  return {
    bucket,
    total: files.length,
    goodCount,
    badCount: badFiles.length,
    validatedDuplicateCount: deletable.length,
    expectedGood,
    safe,
    mismatches: mismatches.slice(0, 20),
    deletable,
  }
}

async function analyzeBucket(bucket: string) {
  return analyzeFiles(bucket, await listAllFiles(bucket))
}

function publicSummary(result: Awaited<ReturnType<typeof analyzeBucket>>) {
  const { deletable: _deletable, ...summary } = result
  return summary
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

    const body = await req.json().catch(() => ({}))
    const dryRun = body?.dry_run !== false
    const buckets = Object.keys(EXPECTED_GOOD_COUNTS)

    const analyses = []
    for (const bucket of buckets) analyses.push(await analyzeBucket(bucket))

    const unsafe = analyses.filter((result) => !result.safe)
    if (unsafe.length) {
      return new Response(JSON.stringify({
        ok: false,
        dry_run: dryRun,
        reason: 'preconditions_failed',
        buckets: analyses.map(publicSummary),
      }), { status: 409, headers: { 'content-type': 'application/json' } })
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true,
        dry_run: true,
        buckets: analyses.map(publicSummary),
      }), { headers: { 'content-type': 'application/json' } })
    }

    if (body?.confirm !== DELETE_CONFIRMATION) {
      return new Response(JSON.stringify({
        ok: false,
        reason: 'confirmation_required',
      }), { status: 400, headers: { 'content-type': 'application/json' } })
    }

    for (const result of analyses) {
      const storage = supabase.storage.from(result.bucket)
      for (let i = 0; i < result.deletable.length; i += 100) {
        const chunk = result.deletable.slice(i, i + 100)
        if (!chunk.length) continue
        const { error } = await storage.remove(chunk)
        if (error) {
          return new Response(JSON.stringify({
            ok: false,
            reason: 'remove_failed',
            bucket: result.bucket,
            error: error.message,
            attempted_in_chunk: chunk.length,
          }), { status: 500, headers: { 'content-type': 'application/json' } })
        }
      }
    }

    const post = []
    for (const bucket of buckets) post.push(await analyzeBucket(bucket))
    const verified = post.every((result) =>
      result.safe &&
      result.badCount === 0 &&
      result.total === EXPECTED_GOOD_COUNTS[result.bucket]
    )

    return new Response(JSON.stringify({
      ok: verified,
      dry_run: false,
      deleted: analyses.reduce((sum, result) => sum + result.deletable.length, 0),
      buckets: post.map(publicSummary),
    }), {
      status: verified ? 200 : 500,
      headers: { 'content-type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
})
