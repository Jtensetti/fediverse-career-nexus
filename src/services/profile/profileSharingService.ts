import { UserFacingError } from '@/lib/userFacingError';
import { supabase } from '@/lib/supabase';
import { formatFederatedHandle, getLocalProfileUrl } from '@/lib/federation';
import type { SharedProfile } from '@/lib/profileSharing';

export async function getOwnProfileForSharing(): Promise<SharedProfile> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new UserFacingError('toasts.loginRequired');
  const [profile, experience, education, skills] = await Promise.all([
    supabase.from('profiles').select('fullname,username,headline,bio,location,contact_email,phone,website').eq('id', user.id).single(),
    supabase.from('experiences').select('title,company,description,start_date,end_date,is_current_role,location').eq('user_id', user.id).order('start_date', { ascending: false }).limit(100),
    supabase.from('education').select('institution,degree,field,start_year,end_year').eq('user_id', user.id).order('start_year', { ascending: false }).limit(100),
    supabase.from('skills').select('name').eq('user_id', user.id).order('name').limit(100),
  ]);
  if (profile.error || experience.error || education.error || skills.error) throw new UserFacingError('ui.profileService.failedToLoadProfile');
  const p = profile.data;
  // Identity-only providers can have an internal, non-deliverable login address.
  const contactEmail = p.contact_email || (user.email?.endsWith('.invalid') ? '' : user.email) || '';
  return { name: p.fullname || '', headline: p.headline || '', bio: p.bio || '', location: p.location || '',
    profileUrl: p.username ? getLocalProfileUrl(p.username) : '', handle: p.username ? formatFederatedHandle(p.username) : '',
    email: contactEmail, phone: p.phone || '', website: p.website || '',
    experience: experience.data, education: education.data, skills: skills.data.map(item => item.name) };
}
