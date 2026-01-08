
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  slug: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  cover_image_url?: string | null;
  tags?: string[] | null;
}

export interface ArticleWithAccess extends Article {
  hasFullAccess: boolean;
  authorInfo?: {
    id: string;
    username: string | null;
    fullname: string | null;
    avatar_url: string | null;
  };
}

// Get user's published articles for profile page
export const getUserPublishedArticles = async (userId: string): Promise<Article[]> => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', userId)
      .eq('published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching user articles:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user articles:', error);
    return [];
  }
};

export interface ArticleAuthor {
  id: string;
  article_id: string;
  user_id: string;
  is_primary: boolean | null;
  can_edit: boolean | null;
  created_at: string;
  profile?: {
    username: string | null;
    fullname: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ArticleFormData {
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  published: boolean;
}

// Create a new article
export const createArticle = async (articleData: ArticleFormData): Promise<Article | null> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to create an article');
      return null;
    }
    
    const { data, error } = await supabase
      .from('articles')
      .insert({
        ...articleData,
        user_id: user.id
      })
      .select()
      .single();
    
    if (error) {
      const isDuplicate = error.code === '23505' || /duplicate key/i.test(error.message);
      toast.error(
        isDuplicate
          ? 'That title/slug is already in use. Please choose another.'
          : `Error creating article: ${error.message}`
      );
      return null;
    }
    
    // Ensure article_authors entry exists (fallback if trigger fails)
    const { error: authorError } = await supabase
      .from('article_authors')
      .upsert({
        article_id: data.id,
        user_id: user.id,
        is_primary: true,
        can_edit: true
      }, { onConflict: 'article_id,user_id' });
    
    if (authorError) {
      console.warn('Failed to create article_authors entry:', authorError);
      // Don't fail the whole operation, the article was created
    }
    
    toast.success('Article created successfully!');
    return data;
  } catch (error) {
    console.error('Error creating article:', error);
    toast.error('Failed to create article. Please try again.');
    return null;
  }
};

// Update an existing article
export const updateArticle = async (id: string, articleData: Partial<ArticleFormData>): Promise<Article | null> => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .update({
        ...articleData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      toast.error(`Error updating article: ${error.message}`);
      return null;
    }
    
    toast.success('Article updated successfully!');
    return data;
  } catch (error) {
    console.error('Error updating article:', error);
    toast.error('Failed to update article. Please try again.');
    return null;
  }
};

// Get an article by ID
export const getArticleById = async (id: string): Promise<Article | null> => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching article:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
};

// Get an article by slug
export const getArticleBySlug = async (slug: string): Promise<Article | null> => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) {
      console.error('Error fetching article:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
};

// Get all published articles
export const getPublishedArticles = async (): Promise<Article[]> => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching published articles:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching published articles:', error);
    return [];
  }
};

// Get user's articles (both drafts and published)
export const getUserArticles = async (): Promise<Article[]> => {
  try {
    // Get articles where user is an author (either primary or collaborator)
    const { data: authoredArticles, error: authorError } = await supabase
      .from('article_authors')
      .select(`
        article_id
      `)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
      .eq('can_edit', true);
    
    if (authorError) {
      console.error('Error fetching authored articles:', authorError);
      return [];
    }
    
    if (!authoredArticles || authoredArticles.length === 0) {
      return [];
    }
    
    // Get the full article data
    const articleIds = authoredArticles.map(article => article.article_id);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .in('id', articleIds)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user articles:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user articles:', error);
    return [];
  }
};

// Get user's draft articles
export const getUserDraftArticles = async (): Promise<Article[]> => {
  try {
    // Get articles where user is an author (either primary or collaborator)
    const { data: authoredArticles, error: authorError } = await supabase
      .from('article_authors')
      .select(`
        article_id
      `)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
      .eq('can_edit', true);
    
    if (authorError) {
      console.error('Error fetching authored articles:', authorError);
      return [];
    }
    
    if (!authoredArticles || authoredArticles.length === 0) {
      return [];
    }
    
    // Get the full article data filtered to drafts only
    const articleIds = authoredArticles.map(article => article.article_id);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .in('id', articleIds)
      .eq('published', false)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user draft articles:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user draft articles:', error);
    return [];
  }
};

// Delete an article
export const deleteArticle = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error(`Error deleting article: ${error.message}`);
      return false;
    }
    
    toast.success('Article deleted successfully!');
    return true;
  } catch (error) {
    console.error('Error deleting article:', error);
    toast.error('Failed to delete article. Please try again.');
    return false;
  }
};

// Get article authors
export const getArticleAuthors = async (articleId: string): Promise<ArticleAuthor[]> => {
  try {
    // Fetch article authors first
    const { data: authors, error: authorsError } = await supabase
      .from('article_authors')
      .select('id, article_id, user_id, is_primary, can_edit, created_at')
      .eq('article_id', articleId);
    
    if (authorsError) {
      console.error('Error fetching article authors:', authorsError);
      return [];
    }

    if (!authors || authors.length === 0) {
      return [];
    }

    // Fetch profiles for each author
    const userIds = authors.map(a => a.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, fullname, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Map profiles to authors
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    return authors.map(author => ({
      ...author,
      profile: profileMap.get(author.user_id) || null
    })) as ArticleAuthor[];
  } catch (error) {
    console.error('Error fetching article authors:', error);
    return [];
  }
};

// Add co-author to article
export const addCoAuthor = async (articleId: string, userId: string, canEdit: boolean = true): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('article_authors')
      .insert({
        article_id: articleId,
        user_id: userId,
        is_primary: false,
        can_edit: canEdit
      });
    
    if (error) {
      toast.error(`Error adding co-author: ${error.message}`);
      return false;
    }
    
    toast.success('Co-author added successfully!');
    return true;
  } catch (error) {
    console.error('Error adding co-author:', error);
    toast.error('Failed to add co-author. Please try again.');
    return false;
  }
};

// Remove co-author from article
export const removeCoAuthor = async (articleId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('article_authors')
      .delete()
      .eq('article_id', articleId)
      .eq('user_id', userId)
      .eq('is_primary', false);
    
    if (error) {
      toast.error(`Error removing co-author: ${error.message}`);
      return false;
    }
    
    toast.success('Co-author removed successfully!');
    return true;
  } catch (error) {
    console.error('Error removing co-author:', error);
    toast.error('Failed to remove co-author. Please try again.');
    return false;
  }
};

// Update author permissions
export const updateAuthorPermissions = async (authorId: string, canEdit: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('article_authors')
      .update({ can_edit: canEdit })
      .eq('id', authorId);
    
    if (error) {
      toast.error(`Error updating author permissions: ${error.message}`);
      return false;
    }
    
    toast.success('Author permissions updated successfully!');
    return true;
  } catch (error) {
    console.error('Error updating author permissions:', error);
    toast.error('Failed to update author permissions. Please try again.');
    return false;
  }
};

// Generate a slug from a title
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
};

// Search for users to add as co-authors
export const searchUsers = async (query: string): Promise<any[]> => {
  try {
    if (!query || query.length < 3) return [];
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, fullname, avatar_url')
      .or(`username.ilike.%${query}%,fullname.ilike.%${query}%`)
      .limit(10);
    
    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};
