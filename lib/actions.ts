'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    // redirect: false so we can full-reload on the client after the cookie is set.
    // Soft Next.js redirects leave root layout/session stale (sidebar missing until refresh).
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    });

    return 'SUCCESS';
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}