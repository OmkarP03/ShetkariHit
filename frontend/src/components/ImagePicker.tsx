import { useRef, useState } from 'react';
import { supabase } from '@/services/supabase';
import { Photo } from '@/components/ui';

/**
 * Profile photo: take with the camera, or choose from the gallery.
 *
 * `capture="user"` on the first input makes Android/iOS open the camera
 * directly rather than the file browser — one tap instead of three. The second
 * input has no capture attribute, so it opens the gallery.
 *
 * Images are downscaled in the browser before upload. A modern phone camera
 * produces 4-8 MB files; pushing that over a rural connection to store a 44px
 * avatar is a waste of the farmer's data.
 */
export default function ImagePicker({
  userId, currentUrl, onUploaded,
}: {
  userId: string;
  currentUrl: string | null;
  onUploaded: (publicUrl: string) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('That file is not an image.'); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('That image is too large (over 10 MB).'); return;
    }

    setBusy(true);
    try {
      const blob = await downscale(file, 512);
      const localUrl = URL.createObjectURL(blob);
      setPreview(localUrl);

      // Path must start with the user id — the storage policy keys off it.
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('profiles')
        .update({ profile_image_url: data.publicUrl })
        .eq('id', userId);
      if (dbErr) throw dbErr;

      onUploaded(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Photo
          src={preview ?? currentUrl ?? undefined}
          alt="Profile photo"
          label=""
          className="h-20 w-20 rounded-pill"
        />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-pill bg-canvas/70 text-sm text-ink">
            …
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <button type="button" disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-card border border-hairline bg-surface text-body text-ink">
            <CameraIcon /> Camera
          </button>
          <button type="button" disabled={busy}
            onClick={() => galleryRef.current?.click()}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-card border border-hairline bg-surface text-body text-ink">
            <ImageIcon /> Gallery
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden"
        onChange={(e) => handle(e.target.files?.[0])} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => handle(e.target.files?.[0])} />
    </div>
  );
}

/** Draw to a canvas at a max edge length and re-encode as JPEG. */
async function downscale(file: File, maxEdge: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image on this device.');
  ctx.drawImage(bitmap, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not process the image.'))),
      'image/jpeg',
      0.85,
    );
  });
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m5 17 4.5-5 3 3 2.5-2.5L19 17" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
