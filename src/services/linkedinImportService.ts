import JSZip from 'jszip';
import { parseCSV, parseLinkedInDate, parseLinkedInYear, cleanText } from '@/lib/csvParser';
import { supabase } from '@/integrations/supabase/client';

// LinkedIn export CSV types
interface LinkedInProfile {
  'First Name'?: string;
  'Last Name'?: string;
  'Headline'?: string;
  'Summary'?: string;
  'Industry'?: string;
  'Geo Location'?: string;
  'Address'?: string;
  'Zip Code'?: string;
}

interface LinkedInPosition {
  'Company Name'?: string;
  'Title'?: string;
  'Description'?: string;
  'Location'?: string;
  'Started On'?: string;
  'Finished On'?: string;
}

interface LinkedInEducation {
  'School Name'?: string;
  'Degree Name'?: string;
  'Notes'?: string;
  'Start Date'?: string;
  'End Date'?: string;
}

interface LinkedInSkill {
  'Name'?: string;
}

interface LinkedInArticle {
  'Title'?: string;
  'Content'?: string;
  'Published Date'?: string;
  'URL'?: string;
}

// Nolto data types for import
export interface NoltoProfile {
  fullname: string;
  headline: string;
  bio: string;
  location: string;
}

export interface NoltoExperience {
  title: string;
  company: string;
  description: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  is_current_role: boolean;
}

export interface NoltoEducation {
  institution: string;
  degree: string;
  field: string;
  start_year: number | null;
  end_year: number | null;
}

export interface NoltoSkill {
  name: string;
}

export interface NoltoArticle {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  published: boolean;
}

export interface LinkedInImportData {
  profile: NoltoProfile | null;
  experiences: NoltoExperience[];
  education: NoltoEducation[];
  skills: NoltoSkill[];
  articles: NoltoArticle[];
  rawFiles: string[];
}

export interface ImportOptions {
  includeProfile: boolean;
  includeExperiences: boolean;
  includeEducation: boolean;
  includeSkills: boolean;
  includeArticles: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: {
    profile: boolean;
    experiences: number;
    education: number;
    skills: number;
    articles: number;
  };
  errors: string[];
}

/**
 * Extract and parse a LinkedIn export ZIP file
 */
export async function parseLinkedInExport(file: File): Promise<LinkedInImportData> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  const result: LinkedInImportData = {
    profile: null,
    experiences: [],
    education: [],
    skills: [],
    articles: [],
    rawFiles: Object.keys(contents.files),
  };
  
  // Parse Profile.csv
  const profileFile = findFile(contents, ['Profile.csv', 'profile.csv']);
  if (profileFile) {
    const profileContent = await profileFile.async('string');
    const parsed = await parseCSV<LinkedInProfile>(profileContent);
    if (parsed.data.length > 0) {
      const p = parsed.data[0];
      result.profile = {
        fullname: cleanText(`${p['First Name'] || ''} ${p['Last Name'] || ''}`).trim(),
        headline: cleanText(p['Headline'] || ''),
        bio: cleanText(p['Summary'] || ''),
        location: cleanText(p['Geo Location'] || p['Address'] || ''),
      };
    }
  }
  
  // Parse Positions.csv (work experience)
  const positionsFile = findFile(contents, ['Positions.csv', 'positions.csv']);
  if (positionsFile) {
    const positionsContent = await positionsFile.async('string');
    const parsed = await parseCSV<LinkedInPosition>(positionsContent);
    result.experiences = parsed.data.map((pos) => ({
      title: cleanText(pos['Title'] || ''),
      company: cleanText(pos['Company Name'] || ''),
      description: cleanText(pos['Description'] || ''),
      location: cleanText(pos['Location'] || ''),
      start_date: parseLinkedInDate(pos['Started On']),
      end_date: parseLinkedInDate(pos['Finished On']),
      is_current_role: !pos['Finished On'] || pos['Finished On'].trim() === '',
    })).filter(exp => exp.title && exp.company);
  }
  
  // Parse Education.csv
  const educationFile = findFile(contents, ['Education.csv', 'education.csv']);
  if (educationFile) {
    const educationContent = await educationFile.async('string');
    const parsed = await parseCSV<LinkedInEducation>(educationContent);
    result.education = parsed.data.map((edu) => {
      const degree = cleanText(edu['Degree Name'] || '');
      const notes = cleanText(edu['Notes'] || '');
      // Try to extract field of study from notes or degree
      let field = '';
      if (notes) {
        field = notes;
      } else if (degree.includes(' in ')) {
        field = degree.split(' in ').slice(1).join(' in ');
      }
      
      return {
        institution: cleanText(edu['School Name'] || ''),
        degree: degree.includes(' in ') ? degree.split(' in ')[0] : degree,
        field: field,
        start_year: parseLinkedInYear(edu['Start Date']),
        end_year: parseLinkedInYear(edu['End Date']),
      };
    }).filter(edu => edu.institution && edu.degree);
  }
  
  // Parse Skills.csv
  const skillsFile = findFile(contents, ['Skills.csv', 'skills.csv']);
  if (skillsFile) {
    const skillsContent = await skillsFile.async('string');
    const parsed = await parseCSV<LinkedInSkill>(skillsContent);
    result.skills = parsed.data
      .map((skill) => ({ name: cleanText(skill['Name'] || '') }))
      .filter(skill => skill.name);
  }
  
  // Parse Articles.csv (if exists)
  const articlesFile = findFile(contents, ['Articles.csv', 'articles.csv', 'Posts.csv', 'posts.csv']);
  if (articlesFile) {
    const articlesContent = await articlesFile.async('string');
    const parsed = await parseCSV<LinkedInArticle>(articlesContent);
    result.articles = parsed.data.map((article) => ({
      title: cleanText(article['Title'] || 'Untitled Import'),
      content: cleanText(article['Content'] || ''),
      excerpt: cleanText(article['Content'] || '').slice(0, 200),
      tags: ['imported-from-linkedin'],
      published: false, // Import as drafts
    })).filter(article => article.content);
  }
  
  return result;
}

/**
 * Find a file in the ZIP by possible names
 */
function findFile(zip: JSZip, possibleNames: string[]): JSZip.JSZipObject | null {
  for (const name of possibleNames) {
    // Check root level
    if (zip.files[name]) {
      return zip.files[name];
    }
    
    // Check in subdirectories
    for (const path of Object.keys(zip.files)) {
      if (path.endsWith(`/${name}`) || path.endsWith(`\\${name}`)) {
        return zip.files[path];
      }
    }
  }
  return null;
}

/**
 * Submit the import data to the backend
 */
export async function submitLinkedInImport(
  data: LinkedInImportData,
  options: ImportOptions
): Promise<ImportResult> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      success: false,
      imported: { profile: false, experiences: 0, education: 0, skills: 0, articles: 0 },
      errors: ['You must be logged in to import data'],
    };
  }
  
  const result: ImportResult = {
    success: true,
    imported: { profile: false, experiences: 0, education: 0, skills: 0, articles: 0 },
    errors: [],
  };
  
  try {
    // Import profile
    if (options.includeProfile && data.profile) {
      const { error } = await supabase
        .from('profiles')
        .update({
          fullname: data.profile.fullname || undefined,
          headline: data.profile.headline || undefined,
          bio: data.profile.bio || undefined,
          location: data.profile.location || undefined,
        })
        .eq('id', user.id);
      
      if (error) {
        result.errors.push(`Profile: ${error.message}`);
      } else {
        result.imported.profile = true;
      }
    }
    
    // Import experiences
    if (options.includeExperiences && data.experiences.length > 0) {
      // Get existing experiences to avoid duplicates
      const { data: existingExp } = await supabase
        .from('experiences')
        .select('company, title, start_date')
        .eq('user_id', user.id);
      
      const existingSet = new Set(
        (existingExp || []).map(e => `${e.company}|${e.title}|${e.start_date}`)
      );
      
      const newExperiences = data.experiences
        .filter(exp => !existingSet.has(`${exp.company}|${exp.title}|${exp.start_date}`))
        .map(exp => ({
          ...exp,
          user_id: user.id,
        }));
      
      if (newExperiences.length > 0) {
        const { error, data: inserted } = await supabase
          .from('experiences')
          .insert(newExperiences)
          .select();
        
        if (error) {
          result.errors.push(`Experiences: ${error.message}`);
        } else {
          result.imported.experiences = inserted?.length || 0;
        }
      }
    }
    
    // Import education
    if (options.includeEducation && data.education.length > 0) {
      // Get existing education to avoid duplicates
      const { data: existingEdu } = await supabase
        .from('education')
        .select('institution, degree')
        .eq('user_id', user.id);
      
      const existingSet = new Set(
        (existingEdu || []).map(e => `${e.institution}|${e.degree}`)
      );
      
      const newEducation = data.education
        .filter(edu => !existingSet.has(`${edu.institution}|${edu.degree}`))
        .map(edu => ({
          ...edu,
          user_id: user.id,
        }));
      
      if (newEducation.length > 0) {
        const { error, data: inserted } = await supabase
          .from('education')
          .insert(newEducation)
          .select();
        
        if (error) {
          result.errors.push(`Education: ${error.message}`);
        } else {
          result.imported.education = inserted?.length || 0;
        }
      }
    }
    
    // Import skills
    if (options.includeSkills && data.skills.length > 0) {
      // Get existing skills to avoid duplicates
      const { data: existingSkills } = await supabase
        .from('skills')
        .select('name')
        .eq('user_id', user.id);
      
      const existingSet = new Set(
        (existingSkills || []).map(s => s.name.toLowerCase())
      );
      
      const newSkills = data.skills
        .filter(skill => !existingSet.has(skill.name.toLowerCase()))
        .map(skill => ({
          ...skill,
          user_id: user.id,
        }));
      
      if (newSkills.length > 0) {
        const { error, data: inserted } = await supabase
          .from('skills')
          .insert(newSkills)
          .select();
        
        if (error) {
          result.errors.push(`Skills: ${error.message}`);
        } else {
          result.imported.skills = inserted?.length || 0;
        }
      }
    }
    
    // Import articles as drafts
    if (options.includeArticles && data.articles.length > 0) {
      const articlesToInsert = data.articles.map(article => ({
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        tags: article.tags,
        published: false,
        user_id: user.id,
      }));
      
      const { error, data: inserted } = await supabase
        .from('articles')
        .insert(articlesToInsert)
        .select();
      
      if (error) {
        result.errors.push(`Articles: ${error.message}`);
      } else {
        result.imported.articles = inserted?.length || 0;
      }
    }
    
    // Track the import (table might not exist yet)
    try {
      await supabase.from('linkedin_imports' as any).insert({
        user_id: user.id,
        import_summary: result.imported,
      });
    } catch {
      // Ignore error if table doesn't exist
    }
    
  } catch (error) {
    result.success = false;
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  result.success = result.errors.length === 0;
  return result;
}

/**
 * Validate that a file is a valid LinkedIn export ZIP
 */
export function validateLinkedInZip(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return { valid: false, error: 'Please upload a ZIP file' };
  }
  
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File is too large (max 100MB)' };
  }
  
  return { valid: true };
}
