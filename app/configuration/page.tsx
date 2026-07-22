import { Suspense } from 'react';
import ConfigurationClient from './configuration-client';

export default function ConfigurationPage() {
  return (
    <Suspense
      fallback={
        <div className="page-content py-20 text-center text-muted-foreground">
          Loading configuration...
        </div>
      }
    >
      <ConfigurationClient />
    </Suspense>
  );
}
