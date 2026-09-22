import { decryptValue, encryptValue, encryptionSecret } from "./encryption.ts";

export const encryptMessage = (value: string) => encryptValue(value, encryptionSecret(), "message");
export const decryptMessage = (value: string) => decryptValue(value, encryptionSecret(), "message");
