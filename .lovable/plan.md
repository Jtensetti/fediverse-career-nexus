
# LinkedIn Import Enhancement Plan

## Summary
Based on extensive analysis of the LinkedIn export format and comparison with open-source parsers like `@knohime/linkedin-import`, the current implementation has the correct file and column mappings for the standard LinkedIn GDPR export. However, there are several robustness improvements needed to handle edge cases, variations in LinkedIn's export format, and to provide better debugging when imports fail.

## Identified Issues

### 1. Date Parsing Fragility
The current date parser handles:
- "Mon YYYY" format (e.g., "Jan 2020")
- "YYYY" format (e.g., "2020")
- ISO dates ("2020-01-15")

Missing formats that LinkedIn sometimes uses:
- Full month names ("January 2020")
- Different date separators
- Empty strings returning undefined instead of null

### 2. Silent Failures
When CSV parsing fails or column names don't match:
- No user feedback about which files were found/missing
- No indication of why data wasn't imported
- The Preview step shows "0 found" without explaining why

### 3. Column Name Matching
LinkedIn's export format can vary:
- Different capitalizations ("Company name" vs "Company Name")
- Extra whitespace around column names
- Slight variations between export versions

### 4. Missing Data Types
LinkedIn exports additional valuable data:
- `Certifications.csv` - Professional certifications
- `Languages.csv` - Language proficiencies
- (Not currently supported in Nolto's schema)

### 5. Articles/Posts Confusion
LinkedIn exports:
- `Shares.csv` - Short-form posts
- `Articles/` folder - Long-form articles (HTML files, not CSV)

The current implementation looks for `Articles.csv` and `Posts.csv` which may not exist.

## Implementation Plan

### Phase 1: Robust Column Name Matching
Add flexible column name matching that:
- Normalizes column headers (trim, lowercase)
- Matches columns case-insensitively
- Handles common variations
- Uses fuzzy matching for near-matches

### Phase 2: Improved Date Parsing
Enhance date parsing to handle:
- Full month names ("January", "February", etc.)
- Various separators and formats
- More lenient year extraction for education

### Phase 3: User Debugging Feedback
Add visible debugging in the Preview step:
- Show which CSV files were found in the ZIP
- Display column headers found vs expected
- Provide actionable feedback when data is missing

### Phase 4: Enhanced File Discovery
Improve file finding to:
- Search recursively in all folders
- Handle case-insensitive file names
- Look for multiple file name variations

### Phase 5: Support Shares.csv for Posts
Add support for importing LinkedIn posts from `Shares.csv`:
- Parse `Shares.csv` for short-form content
- Import as draft articles or posts (if posts table exists)

---

## Technical Details

### File: `src/lib/csvParser.ts`

**Changes:**
1. Add `normalizeColumnHeader` function for case-insensitive matching
2. Enhance `parseLinkedInDate` with full month name support
3. Add a month name mapping for all variations

```typescript
// New: Normalize column headers for flexible matching
export function normalizeColumnHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Enhanced: Full month name support
const MONTH_MAP: Record<string, string> = {
  january: '01', jan: '01',
  february: '02', feb: '02',
  march: '03', mar: '03',
  // ... all months
};
```

### File: `src/services/linkedinImportService.ts`

**Changes:**
1. Add flexible column accessor function
2. Improve file finding with case-insensitive search
3. Add `Shares.csv` parsing for posts
4. Add debugging data to `LinkedInImportData`
5. Handle empty/whitespace-only values consistently

```typescript
// New: Flexible column accessor
function getColumn<T>(row: T, possibleNames: string[]): string | undefined {
  for (const name of possibleNames) {
    const normalized = normalizeColumnHeader(name);
    for (const key of Object.keys(row)) {
      if (normalizeColumnHeader(key) === normalized) {
        return row[key as keyof T] as string;
      }
    }
  }
  return undefined;
}

// Updated interfaces
interface LinkedInPosition {
  'Company Name'?: string;
  'company name'?: string;
  'Title'?: string;
  'title'?: string;
  // ... flexible matching
}

// New: Debug info in result
export interface LinkedInImportData {
  // ... existing fields
  debug: {
    filesFound: string[];
    profileColumnsFound: string[];
    positionsColumnsFound: string[];
    educationColumnsFound: string[];
    skillsColumnsFound: string[];
  };
}
```

### File: `src/components/LinkedInImport/ImportSteps/PreviewStep.tsx`

**Changes:**
1. Add debug section showing files found
2. Show helpful messages when data is missing
3. Add collapsible "Troubleshooting" section

```typescript
// New: Debug information display
{data.rawFiles.length > 0 && (
  <Collapsible>
    <CollapsibleTrigger>
      <span>Files found in ZIP ({data.rawFiles.length})</span>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <ul className="text-xs text-muted-foreground">
        {data.rawFiles.map(file => <li key={file}>{file}</li>)}
      </ul>
    </CollapsibleContent>
  </Collapsible>
)}
```

### File: `src/components/LinkedInImport/ImportSteps/UploadStep.tsx`

**Changes:**
1. Update expected files list to match actual LinkedIn export
2. Add note about data archive types

---

## Files to Modify

1. `src/lib/csvParser.ts`
   - Add `normalizeColumnHeader` function
   - Enhance date parsing with full month names
   - Add logging for debugging

2. `src/services/linkedinImportService.ts`
   - Add flexible column matching
   - Improve file finding with case-insensitivity
   - Add `Shares.csv` support for posts
   - Add debug information to output
   - Better error handling and logging

3. `src/components/LinkedInImport/ImportSteps/PreviewStep.tsx`
   - Add debug section showing detected files
   - Improve empty state messaging
   - Add troubleshooting guidance

4. `src/components/LinkedInImport/ImportSteps/UploadStep.tsx`
   - Update file expectations
   - Add note about "larger archive" option

---

## Testing Recommendations

After implementation:
1. Test with a real LinkedIn "Basic" export ZIP
2. Test with a real LinkedIn "Complete" export ZIP
3. Test with an empty/invalid ZIP file
4. Test with manually created CSV files with various column capitalizations
5. Verify all date formats are parsed correctly
6. Confirm duplicate detection works properly
