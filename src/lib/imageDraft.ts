import { UserFacingError } from './userFacingError.ts';
export interface UploadedPostImage { id: string; path: string; url: string; mediaType: string; size: number }
export interface ImageDraftState {
  file: File | null;
  phase: 'empty' | 'compressing' | 'uploading' | 'ready' | 'error';
  upload?: UploadedPostImage;
  error?: Error;
  compressedSize?: number;
}
interface Dependencies {
  compress(file: File): Promise<File>;
  upload(file: File): Promise<UploadedPostImage>;
  discard(image: UploadedPostImage): Promise<void>;
  changed(state: ImageDraftState): void;
}

/** Each selection owns its asynchronous work. A late result cannot replace a
 * newer image; superseded uploads are discarded only after their upload ends.
 */
export class ImageDraft {
  state: ImageDraftState = { file: null, phase: 'empty' };
  private generation = 0;
  private task: Promise<void> = Promise.resolve();
  private disposed = false;
  private readonly deps: Dependencies;
  constructor(deps: Dependencies) { this.deps = deps; }
  private emit(state: ImageDraftState) { this.state = state; if (!this.disposed) this.deps.changed(state); }
  private discard(upload?: UploadedPostImage) { if (upload) void this.deps.discard(upload).catch(() => { /* Expiry cleanup retries. */ }); }
  select(file: File) {
    const generation = ++this.generation;
    this.discard(this.state.upload);
    this.emit({ file, phase: 'compressing' });
    this.task = (async () => {
      try {
        const compressed = await this.deps.compress(file);
        if (generation !== this.generation) return;
        this.emit({ file, phase: 'uploading', compressedSize: compressed.size });
        const upload = await this.deps.upload(compressed);
        if (generation !== this.generation) { this.discard(upload); return; }
        this.emit({ file, phase: 'ready', upload, compressedSize: compressed.size });
      } catch (error) {
        if (generation === this.generation) this.emit({ file, phase: 'error', error: error instanceof Error ? error : new UserFacingError('runtimeErrors.imageUpload') });
      }
    })();
  }
  retry() { if (this.state.file) this.select(this.state.file); }
  async ready() {
    const generation = this.generation;
    await this.task;
    if (generation !== this.generation) throw new UserFacingError('runtimeErrors.imageChanged');
    if (this.state.phase === 'error') throw this.state.error;
    return this.state.upload;
  }
  clear() { ++this.generation; this.discard(this.state.upload); this.emit({ file: null, phase: 'empty' }); }
  dispose() { this.disposed = true; this.clear(); }
}
