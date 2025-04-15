import { Spacer, Skeleton } from "@heroui/react";

export function Loader() {
    return (
        <div className='mt-6'>
            <h3 className="text-base font-semibold">HackerNews에서 인기있었던 글들이에요.</h3>
            <Spacer y={3} />

            <div className='flex gap-1'>
                <Skeleton className="w-1/2 h-8 mb-2 rounded-lg" />
                <Skeleton className="w-1/2 h-8 mb-2 rounded-lg" />
            </div>
            <Spacer y={2} />
            <Skeleton className="w-1/2 h-4 mb-2 rounded-lg" />
            <Skeleton className="w-full h-4 mb-2 rounded-lg" />
            <Skeleton className="w-3/4 h-4 mb-2 rounded-lg" />
        </div>
    );
}