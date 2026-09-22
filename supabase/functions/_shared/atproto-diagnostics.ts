export type TransportStage = 'url' | 'dns' | 'public-address' | 'http-client' | 'https' | 'response-body';

/** Only bounded categories and the public hostname may reach logs. Never log
 * an OAuth URL, request/response body, state, token, proof or error message. */
export class AtprotoTransportError extends Error {
  constructor(readonly stage: TransportStage, readonly hostname: string, cause?: unknown) {
    super(`AT Protocol transport failed at ${stage}`, { cause });
    this.name = 'AtprotoTransportError';
  }
}

export function atprotoFailureDetails(error: unknown): Record<string, string> {
  const details: Record<string, string> = {};
  let current = error;
  for (let depth = 0; depth < 8 && current instanceof Error; depth++) {
    if (current instanceof AtprotoTransportError) {
      details.transportStage = current.stage;
      details.hostname = current.hostname;
    }
    // Error classes are diagnostic categories. Arbitrary error messages can
    // contain credentials, including an entire failed authorization request.
    if (/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(current.name)) details.errorClass = current.name;
    const code = (current as Error & { code?: unknown }).code;
    if (typeof code === 'string' && /^[A-Z0-9_]{1,40}$/.test(code)) details.errorCode = code;
    current = current.cause;
  }
  return details;
}
