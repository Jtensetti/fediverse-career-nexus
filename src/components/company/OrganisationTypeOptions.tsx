import { useTranslation } from "react-i18next";
import { SelectGroup, SelectItem, SelectLabel } from "@/components/ui/select";
import { isKnownOrganisationType, organisationTypeGroups } from "@/lib/companyOptions";

export default function OrganisationTypeOptions({ selected }: { selected?: string }) {
  const { t } = useTranslation();
  return <>
    {selected && selected !== "all" && !isKnownOrganisationType(selected) && (
      <SelectItem value={selected}>{selected}</SelectItem>
    )}
    {organisationTypeGroups.map(group => (
      <SelectGroup key={group.labelKey}>
        <SelectLabel>{t(group.labelKey)}</SelectLabel>
        {group.options.map(option => (
          <SelectItem key={option.value} value={option.value}>{t(option.labelKey)}</SelectItem>
        ))}
      </SelectGroup>
    ))}
  </>;
}
