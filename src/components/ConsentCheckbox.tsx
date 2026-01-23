import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

interface ConsentCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export default function ConsentCheckbox({ checked, onCheckedChange }: ConsentCheckboxProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start space-x-2">
      <Checkbox 
        id="consent" 
        checked={checked} 
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
        className="mt-1"
      />
      <Label htmlFor="consent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
        {t("auth.consentText", "I agree to the")}{" "}
        <Link to="/terms" className="underline hover:text-foreground" target="_blank">
          {t("auth.termsOfService", "Terms of Service")}
        </Link>
        {" "}{t("auth.and", "and")}{" "}
        <Link to="/privacy" className="underline hover:text-foreground" target="_blank">
          {t("auth.privacyPolicy", "Privacy Policy")}
        </Link>
        {". "}
        {t("auth.consentData", "I understand how my data will be processed.")}
      </Label>
    </div>
  );
}
