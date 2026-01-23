import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

const ProfileVisitsToggle = () => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center gap-2">
        <Eye size={18} className="text-primary" />
        <span className="font-medium">{t('profile.profileViews', 'Profile Views')}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('profile.profileViewsAlwaysOn', 'Profile view statistics are always visible to you. Other users cannot see who viewed their profile.')}
      </p>
    </div>
  );
};

export default ProfileVisitsToggle;
