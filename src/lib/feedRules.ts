export const FEED_RULE_LIMIT = 50;
export interface FeedRules {
  include_tags?: string[];
  exclude_tags?: string[];
  include_keywords?: string[];
  exclude_keywords?: string[];
  include_users?: string[];
  include_actors?: string[];
  include_companies?: string[];
  language?: string[];
}

export function normalizeTag(value: string): string {
  return value.normalize('NFKC').trim().replace(/^#+/, '').toLowerCase();
}

export function validTag(value: string): boolean {
  return value.length <= 80 && /^[\p{L}\p{N}_]+$/u.test(value);
}

export function hasFeedSources(rules: FeedRules): boolean {
  return [rules.include_tags, rules.include_users, rules.include_actors, rules.include_companies, rules.include_keywords]
    .some(values => (values?.length ?? 0) > 0);
}
