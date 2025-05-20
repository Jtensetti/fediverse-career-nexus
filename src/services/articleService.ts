
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
    const { data, error } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();
    
    if (error) {
      toast.error(`Error creating article: ${error.message}`);
      return null;
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

// Get user's articles
export const getUserArticles = async (): Promise<Article[]> => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
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

// Generate a slug from a title
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
};
