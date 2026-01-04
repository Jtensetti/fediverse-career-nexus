
// Re-export from the shared module for backwards compatibility
export { 
  signRequest, 
  generateRsaKeyPair,
  ensureActorHasKeys,
  signedFetch
} from "../_shared/http-signature.ts";
