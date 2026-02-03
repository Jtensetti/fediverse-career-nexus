import { supabase } from "@/integrations/supabase/client";

export interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: 'totp';
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

export interface EnrollmentResult {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

/**
 * Get all MFA factors for the current user
 */
export const getMFAFactors = async (): Promise<MFAFactor[]> => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  
  if (error) {
    console.error('Error fetching MFA factors:', error);
    return [];
  }
  
  return data.totp as MFAFactor[];
};

/**
 * Check if the user has MFA enabled (has a verified TOTP factor)
 */
export const isMFAEnabled = async (): Promise<boolean> => {
  const factors = await getMFAFactors();
  return factors.some(factor => factor.status === 'verified');
};

/**
 * Get the verified TOTP factor if exists
 */
export const getVerifiedFactor = async (): Promise<MFAFactor | null> => {
  const factors = await getMFAFactors();
  return factors.find(factor => factor.status === 'verified') || null;
};

/**
 * Start TOTP enrollment - returns QR code and secret
 */
export const enrollTOTP = async (friendlyName?: string): Promise<EnrollmentResult | null> => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: friendlyName || 'Authenticator App',
  });
  
  if (error) {
    console.error('Error enrolling TOTP:', error);
    throw new Error(error.message);
  }
  
  return data as EnrollmentResult;
};

/**
 * Complete enrollment by verifying the TOTP code
 */
export const verifyEnrollment = async (factorId: string, code: string): Promise<boolean> => {
  // First, create a challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  
  if (challengeError) {
    console.error('Error creating challenge:', challengeError);
    throw new Error(challengeError.message);
  }
  
  // Then verify the challenge with the code
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });
  
  if (verifyError) {
    console.error('Error verifying code:', verifyError);
    throw new Error(verifyError.message);
  }
  
  return true;
};

/**
 * Challenge and verify during login (AAL upgrade)
 */
export const challengeAndVerify = async (factorId: string, code: string): Promise<boolean> => {
  // Create a challenge for the factor
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  
  if (challengeError) {
    console.error('Error creating challenge:', challengeError);
    throw new Error(challengeError.message);
  }
  
  // Verify with the TOTP code
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });
  
  if (verifyError) {
    console.error('Error verifying MFA:', verifyError);
    throw new Error(verifyError.message);
  }
  
  return true;
};

/**
 * Unenroll (disable) a TOTP factor
 */
export const unenrollFactor = async (factorId: string): Promise<boolean> => {
  const { error } = await supabase.auth.mfa.unenroll({
    factorId,
  });
  
  if (error) {
    console.error('Error unenrolling factor:', error);
    throw new Error(error.message);
  }
  
  return true;
};

/**
 * Check current AAL level
 */
export const getAALevel = async (): Promise<'aal1' | 'aal2' | null> => {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  
  if (error) {
    console.error('Error getting AAL:', error);
    return null;
  }
  
  return data.currentLevel;
};

/**
 * Check if MFA verification is needed (user has MFA but is at AAL1)
 */
export const needsMFAVerification = async (): Promise<{ needed: boolean; factorId?: string }> => {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  
  if (error) {
    console.error('Error checking MFA status:', error);
    return { needed: false };
  }
  
  // If current level is aal1 but next level should be aal2, MFA is needed
  if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
    const factors = await getMFAFactors();
    const verifiedFactor = factors.find(f => f.status === 'verified');
    return { 
      needed: true, 
      factorId: verifiedFactor?.id 
    };
  }
  
  return { needed: false };
};
