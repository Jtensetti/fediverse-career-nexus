import type { TFunction } from "i18next";
import type { Database } from "@/integrations/supabase/types";

type CompanySize = Database['public']['Enums']['company_size'];
interface OrganisationTypeOption { value: string; labelKey: string }

// Values are persisted in companies.industry. Retain existing values so that
// editing and filtering older profiles remain compatible across UI languages.
export const organisationTypeGroups: ReadonlyArray<{
  labelKey: string;
  options: ReadonlyArray<OrganisationTypeOption>;
}> = [
  { labelKey: "companyTypes.groups.business", options: [
    { value: "private_company", labelKey: "companyTypes.privateCompany" },
    { value: "startup", labelKey: "companyTypes.startup" },
    { value: "limited_company", labelKey: "companyTypes.limitedCompany" },
    { value: "listed_company", labelKey: "companyTypes.listedCompany" },
    { value: "sole_trader", labelKey: "companyTypes.soleTrader" },
    { value: "partnership", labelKey: "companyTypes.partnership" },
    { value: "limited_partnership", labelKey: "companyTypes.limitedPartnership" },
    { value: "cooperative", labelKey: "companyTypes.cooperative" },
    { value: "Konsultbolag", labelKey: "companyTypes.consultancy" },
  ] },
  { labelKey: "companyTypes.groups.public", options: [
    { value: "Kommun", labelKey: "companyTypes.municipality" },
    { value: "Region", labelKey: "companyTypes.region" },
    { value: "Statlig myndighet", labelKey: "companyTypes.governmentAgency" },
    { value: "Statligt bolag", labelKey: "companyTypes.stateOwnedCompany" },
    { value: "Kommunalt bolag", labelKey: "companyTypes.municipalCompany" },
    { value: "Förbund / samverkansorgan", labelKey: "companyTypes.publicPartnership" },
  ] },
  { labelKey: "companyTypes.groups.educationAndCivilSociety", options: [
    { value: "Universitet & högskola", labelKey: "companyTypes.university" },
    { value: "Folkhögskola", labelKey: "companyTypes.adultEducation" },
    { value: "Civilsamhälle / ideell organisation", labelKey: "companyTypes.nonprofit" },
    { value: "foundation", labelKey: "companyTypes.foundation" },
  ] },
  { labelKey: "companyTypes.groups.other", options: [
    { value: "Annat", labelKey: "companyTypes.other" },
  ] },
];

const organisationTypes = organisationTypeGroups.flatMap(group => group.options);

export function isKnownOrganisationType(value: string): boolean {
  return organisationTypes.some(option => option.value === value);
}

export function getOrganisationTypeLabel(value: string, t: TFunction): string {
  const option = organisationTypes.find(option => option.value === value);
  // Older free-text values are user content, not translation keys.
  return option ? t(option.labelKey) : value;
}

export const companySizeOptions: ReadonlyArray<{ value: CompanySize; labelKey: string }> = [
  { value: '1-10', labelKey: 'ui.companyForm.size110Anstallda' },
  { value: '11-50', labelKey: 'ui.companyForm.size1150Anstallda' },
  { value: '51-200', labelKey: 'ui.companyForm.size51200Anstallda' },
  { value: '201-500', labelKey: 'ui.companyForm.size201500Anstallda' },
  { value: '501-1000', labelKey: 'ui.companyForm.size5011000Anstallda' },
  { value: '1001-5000', labelKey: 'ui.companyForm.size10015000' },
  { value: '5001-10000', labelKey: 'ui.companyForm.size500110000' },
  { value: '10000+', labelKey: 'ui.companyForm.size10001Anstallda' },
];

export function getCompanySizeLabel(value: CompanySize, t: TFunction): string {
  const option = companySizeOptions.find(option => option.value === value);
  return option ? t(option.labelKey) : value;
}
