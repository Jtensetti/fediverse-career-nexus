import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FederatedPost } from "@/services/federationService";

export interface CreateCompanyPostData {
  companyId: string;
  content: string;
  imageFile?: File;
  imageAltText?: string;
  contentWarning?: string;
}

/**
 * Create a post as a company (local only for V1 - no federation as actor)
 */
export async function createCompanyPost(postData: CreateCompanyPostData): Promise<string | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error("You must be logged in to create a post");
      return null;
    }

    // Verify user has permission to post as this company
    const { data: role, error: roleError } = await supabase
      .from('company_roles')
      .select('role')
      .eq('company_id', postData.companyId)
      .eq('user_id', user.id)
      .single();

    if (roleError || !role) {
      toast.error("You don't have permission to post for this company");
      return null;
    }

    const allowedRoles = ['owner', 'admin', 'editor'];
    if (!allowedRoles.includes(role.role)) {
      toast.error("You don't have permission to post for this company");
      return null;
    }

    // Get company info for the post
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, slug, logo_url')
      .eq('id', postData.companyId)
      .single();

    if (companyError || !company) {
      toast.error("Company not found");
      return null;
    }

    // Handle image upload if provided
    let imageUrl: string | null = null;
    if (postData.imageFile) {
      const fileExt = postData.imageFile.name.split('.').pop();
      const fileName = `${postData.companyId}-${Date.now()}.${fileExt}`;
      const filePath = `company-posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, postData.imageFile);

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        toast.error("Failed to upload image");
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
    }

    // Create company post as a local Note (no federation actor yet)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const postId = crypto.randomUUID();

    const noteObject = {
      type: 'Note',
      id: `${supabaseUrl}/company/${company.slug}/posts/${postId}`,
      content: postData.content,
      published: new Date().toISOString(),
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      attachment: imageUrl ? [{
        type: 'Image',
        mediaType: 'image/jpeg',
        url: imageUrl,
        name: postData.imageAltText || ''
      }] : undefined,
      // Company author info (not an AP actor yet)
      company: {
        id: postData.companyId,
        name: company.name,
        slug: company.slug,
        logo_url: company.logo_url
      }
    };

    // Add content warning if provided
    if (postData.contentWarning) {
      (noteObject as any).summary = postData.contentWarning;
      (noteObject as any).sensitive = true;
    }

    const createActivity = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Create',
      id: `${supabaseUrl}/company/${company.slug}/activities/${crypto.randomUUID()}`,
      published: new Date().toISOString(),
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      object: noteObject
    };

    // Insert into ap_objects with company_id
    const { data: post, error: postError } = await supabase
      .from('ap_objects')
      .insert({
        type: 'Create',
        content: createActivity as any,
        company_id: postData.companyId,
        published_at: new Date().toISOString(),
        content_warning: postData.contentWarning || null,
      })
      .select('id')
      .single();

    if (postError) {
      console.error('Post creation error:', postError);
      toast.error("Failed to create post");
      return null;
    }

    // Update company's last_post_at
    await supabase
      .from('companies')
      .update({ last_post_at: new Date().toISOString() })
      .eq('id', postData.companyId);

    toast.success("Post created successfully!");
    return post.id;

  } catch (error) {
    console.error('Unexpected error creating company post:', error);
    toast.error("An unexpected error occurred");
    return null;
  }
}

/**
 * Get posts for a specific company
 */
export async function getCompanyPosts(companyId: string, limit = 20, offset = 0): Promise<FederatedPost[]> {
  const { data: posts, error } = await supabase
    .from('ap_objects')
    .select('id, content, created_at, published_at, type, content_warning, company_id')
    .eq('company_id', companyId)
    .in('type', ['Create', 'Note'])
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching company posts:', error);
    return [];
  }

  // Get company info for the posts
  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, logo_url')
    .eq('id', companyId)
    .single();

  return (posts || []).map(post => {
    const raw = post.content as any;
    const note = raw?.type === 'Create' ? raw.object : raw;

    return {
      id: post.id,
      type: post.type,
      source: 'local' as const,
      content: raw,
      published_at: post.published_at,
      created_at: post.created_at,
      content_warning: post.content_warning,
      // Company author info
      company: company ? {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo_url: company.logo_url
      } : undefined,
      actor_name: company?.name,
      actor_avatar: company?.logo_url,
    } as FederatedPost;
  });
}

/**
 * Delete a company post
 */
export async function deleteCompanyPost(postId: string, companyId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error("You must be logged in");
    return false;
  }

  // Verify user has permission
  const { data: role } = await supabase
    .from('company_roles')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single();

  if (!role || !['owner', 'admin'].includes(role.role)) {
    toast.error("You don't have permission to delete this post");
    return false;
  }

  const { error } = await supabase
    .from('ap_objects')
    .delete()
    .eq('id', postId)
    .eq('company_id', companyId);

  if (error) {
    console.error('Error deleting company post:', error);
    toast.error("Failed to delete post");
    return false;
  }

  toast.success("Post deleted");
  return true;
}
