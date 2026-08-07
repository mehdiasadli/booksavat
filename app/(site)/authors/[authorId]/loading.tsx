import { Skeleton } from "@/components/ui/skeleton";

export default function AuthorLoading() {
	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-6 sm:flex-row">
				<Skeleton className="mx-auto size-40 rounded-full sm:mx-0" />
				<div className="flex-1 space-y-4">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-10 w-3/4" />
					<Skeleton className="h-4 w-1/3" />
					<div className="flex gap-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-28" />
					</div>
					<Skeleton className="h-8 w-32" />
				</div>
			</div>
			<div className="space-y-2">
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-4/5" />
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				{["a", "b", "c", "d"].map((key) => (
					<Skeleton key={key} className="h-24 w-full rounded-lg" />
				))}
			</div>
		</div>
	);
}
