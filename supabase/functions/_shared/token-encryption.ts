import { decryptValue, encryptValue, encryptionSecret } from "./encryption.ts";

export const encryptToken = (value: string) => encryptValue(value, encryptionSecret(), "oauth-token");
export const decryptToken = (value: string) => decryptValue(value, encryptionSecret(), "oauth-token");
