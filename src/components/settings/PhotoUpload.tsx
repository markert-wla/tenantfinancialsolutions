'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  userId: string
  currentUrl: string | null
  onUpload: (url: string) => void
  onRemove: () => void
}

export default function PhotoUpload({ userId, currentUrl, onUpload, onRemove }: Props) {
  const [preview, setPreview]     = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [dragging, setDragging]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.')
      return
    }

    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setUploading(true)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/avatar.${ext}`
    const supabase = createClient()

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    setUploading(false)

    if (uploadError) {
      setError(uploadError.message)
      setPreview(currentUrl)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`
    setPreview(publicUrl)
    onUpload(publicUrl)
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() { setDragging(false) }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleRemove() {
    setPreview(null)
    onRemove()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-5">
        {/* Avatar circle */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
            {preview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview} alt="Profile photo" className="w-full h-full object-cover" />
            ) : (
              <Camera size={24} className="text-gray-400" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                <Loader2 size={20} className="text-white animate-spin" />
              </div>
            )}
          </div>
          {preview && !uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1 -right-1 bg-white border border-gray-200 rounded-full p-0.5 text-gray-400 hover:text-red-500 transition-colors"
              title="Remove photo"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`flex-1 border-2 border-dashed rounded-lg px-4 py-4 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-tfs-teal bg-tfs-teal/5'
              : 'border-gray-200 hover:border-tfs-teal hover:bg-gray-50'
          }`}
        >
          <p className="text-sm text-tfs-slate">
            <span className="text-tfs-teal font-medium">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-tfs-slate/70 mt-0.5">PNG, JPG, WEBP — max 5 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onChange}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
