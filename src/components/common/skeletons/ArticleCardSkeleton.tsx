import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ArticleCardSkeleton = () => {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-4/5" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArticleCardSkeleton;
