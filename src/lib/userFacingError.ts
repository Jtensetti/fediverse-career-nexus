import i18next from 'i18next';

/** Safe application messages, translated when read so a language change also
 * updates an error that is already visible. Independent of the browser setup. */
export class UserFacingError extends Error {
  readonly key: string;
  readonly values?: Record<string, unknown>;

  constructor(key: string, values?: Record<string, unknown>) {
    super();
    this.name = 'UserFacingError';
    this.key = key;
    this.values = values;
    Object.defineProperty(this, 'message', {
      configurable: true,
      get: () => String(i18next.t(this.key, this.values)),
    });
  }
}

/** Never expose raw database, browser or cryptography errors in the UI. */
export function userFacingErrorMessage(error: unknown, fallbackKey: string): string {
  return error instanceof UserFacingError ? error.message : String(i18next.t(fallbackKey));
}
