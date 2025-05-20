
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

const CodeOfConduct = ({ onAccept }: { onAccept?: (accepted: boolean) => void }) => {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);

  const handleChange = (checked: boolean | string) => {
    setAccepted(!!checked);
    if (onAccept) {
      onAccept(!!checked);
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{t('codeOfConduct.title', 'Code of Conduct')}</CardTitle>
        <CardDescription>
          {t('codeOfConduct.description', 'Our community guidelines and ethical standards')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold">{t('codeOfConduct.principles', 'Core Principles')}</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t('codeOfConduct.respectful', 'Be respectful and inclusive in all interactions')}</li>
            <li>{t('codeOfConduct.harassment', 'No harassment or discrimination of any kind')}</li>
            <li>{t('codeOfConduct.privacy', 'Respect privacy and confidentiality')}</li>
            <li>{t('codeOfConduct.truthful', 'Share truthful information and avoid spreading misinformation')}</li>
            <li>{t('codeOfConduct.constructive', 'Engage in constructive criticism and dialogue')}</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold">{t('codeOfConduct.prohibited', 'Prohibited Content')}</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t('codeOfConduct.hate', 'Hate speech and content that promotes violence or discrimination')}</li>
            <li>{t('codeOfConduct.harassment2', 'Harassment, bullying, or intimidation')}</li>
            <li>{t('codeOfConduct.illegal', 'Illegal content or activities')}</li>
            <li>{t('codeOfConduct.private', 'Sharing private information without consent')}</li>
            <li>{t('codeOfConduct.spam', 'Spam or deceptive practices')}</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold">{t('codeOfConduct.enforcement', 'Enforcement')}</h3>
          <p>{t('codeOfConduct.enforcementDesc', 'Violation of these guidelines may result in content removal, account warnings, temporary suspension, or permanent banning depending on the severity and frequency of violations.')}</p>
        </div>
        
        <div className="flex items-center space-x-2 mt-6 pt-4 border-t">
          <Checkbox 
            id="accept-coc" 
            checked={accepted}
            onCheckedChange={handleChange}
          />
          <label
            htmlFor="accept-coc"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t('codeOfConduct.agree', 'I agree to follow the Code of Conduct')}
          </label>
        </div>
      </CardContent>
    </Card>
  );
};

export default CodeOfConduct;
