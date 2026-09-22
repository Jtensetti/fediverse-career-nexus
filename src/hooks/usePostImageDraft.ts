import { useEffect, useRef, useState } from 'react';
import { compressImage } from '@/lib/imageCompression';
import { ImageDraft, type ImageDraftState } from '@/lib/imageDraft';
import { discardPostImage, uploadPostImage } from '@/services/media/postImageService';

export function usePostImageDraft() {
  const [state, setState] = useState<ImageDraftState>({ file: null, phase: 'empty' });
  const [preview, setPreview] = useState<string>();
  const current = useRef<ImageDraft>();
  // Allocate in the effect so React's development setup/cleanup replay gets a
  // fresh controller and never leaves uploads on a disposed controller.
  useEffect(() => {
    const draft = new ImageDraft({ compress: compressImage, upload: uploadPostImage, discard: discardPostImage, changed: setState });
    current.current = draft;
    return () => { draft.dispose(); };
  }, []);
  useEffect(() => {
    if (!state.file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(state.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [state.file]);
  return { ...state, preview,
    select: (file: File) => current.current?.select(file),
    clear: () => current.current?.clear(),
    retry: () => current.current?.retry(),
    ready: () => current.current?.ready() || Promise.resolve(undefined),
  };
}
