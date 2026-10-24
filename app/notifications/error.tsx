'use client';

import { Button } from '@/components/ui/button';

export default function NotificationsError({ reset }: { reset: () => void }) {
  return (
    <div className="page-content mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
      <div className="bento-tile space-y-3 p-8 text-center">
        <h1 className="font-heading text-2xl font-semibold">Notifications could not be opened</h1>
        <p className="text-sm text-muted-foreground">Try loading the notification center again.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
