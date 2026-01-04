
// Re-export from the shared module for backwards compatibility
export { 
  ensureActorHasKeys, 
  signedFetch, 
  signRequest, 
  generateRsaKeyPair 
} from "../_shared/http-signature.ts";
