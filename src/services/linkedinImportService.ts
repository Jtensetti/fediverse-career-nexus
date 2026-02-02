import JSZip from 'jszip';
import { parseCSV, parseLinkedInDate, parseLinkedInYear, cleanText, getFlexibleColumn } from '@/lib/csvParser';
import { supabase } from '@/integrations/supabase/client';

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

export interface ImportDebugInfo {
  filesFound: string[];
  profileColumns: string[];
  positionsColumns: string[];
  educationColumns: string[];
  skillsColumns: string[];
  sharesColumns: string[];
}

export interface LinkedInImportData {
  profile: NoltoProfile | null;
  experiences: NoltoExperience[];
  education: NoltoEducation[];
  skills: NoltoSkill[];
  articles: NoltoArticle[];
  rawFiles: string[];
  debug: ImportDebugInfo;
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

// Flexible column name mappings for LinkedIn export variations
const PROFILE_COLUMNS = {
  firstName: ['First Name', 'FirstName', 'first name', 'first_name'],
  lastName: ['Last Name', 'LastName', 'last name', 'last_name'],
  headline: ['Headline', 'headline', 'Professional Headline'],
  summary: ['Summary', 'summary', 'About', 'Bio'],
  industry: ['Industry', 'industry'],
  geoLocation: ['Geo Location', 'GeoLocation', 'geo location', 'Location', 'location'],
  address: ['Address', 'address'],
};

const POSITION_COLUMNS = {
  companyName: ['Company Name', 'CompanyName', 'company name', 'Company', 'company'],
  title: ['Title', 'title', 'Position', 'position', 'Job Title'],
  description: ['Description', 'description'],
  location: ['Location', 'location'],
  startedOn: ['Started On', 'StartedOn', 'started on', 'Start Date', 'start date'],
  finishedOn: ['Finished On', 'FinishedOn', 'finished on', 'End Date', 'end date'],
};

const EDUCATION_COLUMNS = {
  schoolName: ['School Name', 'SchoolName', 'school name', 'School', 'school', 'Institution'],
  degreeName: ['Degree Name', 'DegreeName', 'degree name', 'Degree', 'degree'],
  notes: ['Notes', 'notes', 'Field of Study', 'Activities and Societies'],
  startDate: ['Start Date', 'StartDate', 'start date', 'Started'],
  endDate: ['End Date', 'EndDate', 'end date', 'Ended'],
};

const SKILL_COLUMNS = {
  name: ['Name', 'name', 'Skill', 'skill'],
};

const SHARE_COLUMNS = {
  shareCommentary: ['ShareCommentary', 'Share Commentary', 'share commentary', 'Commentary', 'Text', 'Content'],
  shareDate: ['Date', 'date', 'SharedDate', 'Shared Date', 'CreatedAt', 'Created At'],
  shareLink: ['ShareLink', 'Share Link', 'Link', 'URL', 'url'],
};

/**
 * Extract and parse a LinkedIn export ZIP file
 */
export async function parseLinkedInExport(file: File): Promise<LinkedInImportData> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  const debug: ImportDebugInfo = {
    filesFound: [],
    profileColumns: [],
    positionsColumns: [],
    educationColumns: [],
    skillsColumns: [],
    sharesColumns: [],
  };
  
  const result: LinkedInImportData = {
    profile: null,
    experiences: [],
    education: [],
    skills: [],
    articles: [],
    rawFiles: Object.keys(contents.files).filter(f => !contents.files[f].dir),
    debug,
  };
  
  // Store all CSV files found for debugging
  debug.filesFound = result.rawFiles.filter(f => f.toLowerCase().endsWith('.csv'));
  
  // Parse Profile.csv
  const profileFile = findFile(contents, ['Profile.csv', 'profile.csv', 'Basic_Profile.csv']);
  if (profileFile) {
    const profileContent = await profileFile.async('string');
    const parsed = await parseCSV<Record<string, string>>(profileContent);
    if (parsed.data.length > 0) {
      debug.profileColumns = parsed.meta.fields || [];
      const p = parsed.data[0];
      
      const firstName = getFlexibleColumn(p, PROFILE_COLUMNS.firstName) || '';
      const lastName = getFlexibleColumn(p, PROFILE_COLUMNS.lastName) || '';
      
      result.profile = {
        fullname: cleanText(`${firstName} ${lastName}`).trim(),
        headline: cleanText(getFlexibleColumn(p, PROFILE_COLUMNS.headline) || ''),
        bio: cleanText(getFlexibleColumn(p, PROFILE_COLUMNS.summary) || ''),
        location: cleanText(
          getFlexibleColumn(p, PROFILE_COLUMNS.geoLocation) || 
          getFlexibleColumn(p, PROFILE_COLUMNS.address) || ''
        ),
      };
    }
  }
  
  // Parse Positions.csv (work experience)
  const positionsFile = findFile(contents, ['Positions.csv', 'positions.csv', 'Work_Experience.csv']);
  if (positionsFile) {
    const positionsContent = await positionsFile.async('string');
    const parsed = await parseCSV<Record<string, string>>(positionsContent);
    debug.positionsColumns = parsed.meta.fields || [];
    
    result.experiences = parsed.data.map((pos) => {
      const finishedOn = getFlexibleColumn(pos, POSITION_COLUMNS.finishedOn);
      return {
        title: cleanText(getFlexibleColumn(pos, POSITION_COLUMNS.title) || ''),
        company: cleanText(getFlexibleColumn(pos, POSITION_COLUMNS.companyName) || ''),
        description: cleanText(getFlexibleColumn(pos, POSITION_COLUMNS.description) || ''),
        location: cleanText(getFlexibleColumn(pos, POSITION_COLUMNS.location) || ''),
        start_date: parseLinkedInDate(getFlexibleColumn(pos, POSITION_COLUMNS.startedOn)),
        end_date: parseLinkedInDate(finishedOn),
        is_current_role: !finishedOn || finishedOn.trim() === '',
      };
    }).filter(exp => exp.title && exp.company);
  }
  
  // Parse Education.csv
  const educationFile = findFile(contents, ['Education.csv', 'education.csv']);
  if (educationFile) {
    const educationContent = await educationFile.async('string');
    const parsed = await parseCSV<Record<string, string>>(educationContent);
    debug.educationColumns = parsed.meta.fields || [];
    
    result.education = parsed.data.map((edu) => {
      const degree = cleanText(getFlexibleColumn(edu, EDUCATION_COLUMNS.degreeName) || '');
      const notes = cleanText(getFlexibleColumn(edu, EDUCATION_COLUMNS.notes) || '');
      
      // Try to extract field of study from notes or degree
      let field = '';
      if (notes) {
        field = notes;
      } else if (degree.includes(' in ')) {
        field = degree.split(' in ').slice(1).join(' in ');
      }
      
      return {
        institution: cleanText(getFlexibleColumn(edu, EDUCATION_COLUMNS.schoolName) || ''),
        degree: degree.includes(' in ') ? degree.split(' in ')[0] : degree,
        field: field,
        start_year: parseLinkedInYear(getFlexibleColumn(edu, EDUCATION_COLUMNS.startDate)),
        end_year: parseLinkedInYear(getFlexibleColumn(edu, EDUCATION_COLUMNS.endDate)),
      };
    }).filter(edu => edu.institution && edu.degree);
  }
  
  // Parse Skills.csv
  const skillsFile = findFile(contents, ['Skills.csv', 'skills.csv']);
  if (skillsFile) {
    const skillsContent = await skillsFile.async('string');
    const parsed = await parseCSV<Record<string, string>>(skillsContent);
    debug.skillsColumns = parsed.meta.fields || [];
    
    result.skills = parsed.data
      .map((skill) => ({ 
        name: cleanText(getFlexibleColumn(skill, SKILL_COLUMNS.name) || '') 
      }))
      .filter(skill => skill.name);
  }
  
  // Parse Shares.csv for posts/articles (LinkedIn's actual export format)
  const sharesFile = findFile(contents, ['Shares.csv', 'shares.csv', 'Posts.csv', 'posts.csv', 'Articles.csv', 'articles.csv']);
  if (sharesFile) {
    const sharesContent = await sharesFile.async('string');
    const parsed = await parseCSV<Record<string, string>>(sharesContent);
    debug.sharesColumns = parsed.meta.fields || [];
    
    result.articles = parsed.data
      .map((share) => {
        const content = cleanText(getFlexibleColumn(share, SHARE_COLUMNS.shareCommentary) || '');
        const link = getFlexibleColumn(share, SHARE_COLUMNS.shareLink) || '';
        
        // Create a meaningful title from content
        const title = content.slice(0, 60).trim() + (content.length > 60 ? '...' : '') || 'Imported Post';
        
        // Append link to content if exists
        const fullContent = link ? `${content}\n\n[Original Link](${link})` : content;
        
        return {
          title: title,
          content: fullContent,
          excerpt: content.slice(0, 200),
          tags: ['imported-from-linkedin'],
          published: false, // Import as drafts
        };
      })
      .filter(article => article.content && article.content.length > 10); // Filter out empty or very short posts
  }
  
  return result;
}

/**
 * Find a file in the ZIP by possible names (case-insensitive, recursive)
 */
function findFile(zip: JSZip, possibleNames: string[]): JSZip.JSZipObject | null {
  const normalizedNames = possibleNames.map(n => n.toLowerCase());
  
  for (const path of Object.keys(zip.files)) {
    if (zip.files[path].dir) continue;
    
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    
    if (normalizedNames.includes(fileName)) {
      return zip.files[path];
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
        (existingExp || []).map(e => `${e.company?.toLowerCase()}|${e.title?.toLowerCase()}|${e.start_date}`)
      );
      
      const newExperiences = data.experiences
        .filter(exp => !existingSet.has(`${exp.company.toLowerCase()}|${exp.title.toLowerCase()}|${exp.start_date}`))
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
        (existingEdu || []).map(e => `${e.institution?.toLowerCase()}|${e.degree?.toLowerCase()}`)
      );
      
      const newEducation = data.education
        .filter(edu => !existingSet.has(`${edu.institution.toLowerCase()}|${edu.degree.toLowerCase()}`))
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
        (existingSkills || []).map(s => s.name?.toLowerCase())
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
