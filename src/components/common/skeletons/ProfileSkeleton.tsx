import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ProfileSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20" />
        <CardContent className="pt-0 relative">
          <div className="flex flex-col md:flex-row gap-6 -mt-16">
            <Skeleton className="w-32 h-32 rounded-full border-4 border-background" />
            <div className="flex-grow pt-4 md:pt-16 space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-2 pt-4 md:pt-16">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-12 h-12 rounded" />
                <div className="flex-grow space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSkeleton;
