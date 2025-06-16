
// HTTP Signature implementation for ActivityPub
export async function signRequest(
  url: string,
  method: string,
  body: string | null,
  privateKey: string,
  keyId: string
): Promise<{ [key: string]: string }> {
  const urlObj = new URL(url);
  const host = urlObj.host;
  const path = urlObj.pathname + urlObj.search;
  
  // Create the date header
  const date = new Date().toUTCString();
  
  // Create the digest header if there's a body
  let digest = '';
  if (body) {
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const hashBase64 = btoa(String.fromCharCode(...hashArray));
    digest = `SHA-256=${hashBase64}`;
  }
  
  // Create the signature string
  const signatureString = body
    ? `(request-target): ${method.toLowerCase()} ${path}\nhost: ${host}\ndate: ${date}\ndigest: ${digest}`
    : `(request-target): ${method.toLowerCase()} ${path}\nhost: ${host}\ndate: ${date}`;
  
  // Import the private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  
  // Convert base64 to binary
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  
  // Sign the string
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signatureString)
  );
  
  // Convert to base64
  const signatureArray = new Uint8Array(signatureBuffer);
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  
  // Create the signature header
  const headers = body
    ? `(request-target) host date digest`
    : `(request-target) host date`;
  
  const signature = `keyId="${keyId}",algorithm="rsa-sha256",headers="${headers}",signature="${signatureBase64}"`;
  
  // Return headers
  const result: { [key: string]: string } = {
    'Host': host,
    'Date': date,
    'Signature': signature,
  };
  
  if (digest) {
    result['Digest'] = digest;
  }
  
  return result;
}

export async function generateRsaKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
  // Generate RSA key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export private key
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyArray = new Uint8Array(privateKeyBuffer);
  const privateKeyBase64 = btoa(String.fromCharCode(...privateKeyArray));
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;

  // Export public key
  const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeyArray = new Uint8Array(publicKeyBuffer);
  const publicKeyBase64 = btoa(String.fromCharCode(...publicKeyArray));
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

  return {
    privateKey: privateKeyPem,
    publicKey: publicKeyPem
  };
}
