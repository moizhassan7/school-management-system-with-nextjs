export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { schedulePasswordUpgrade } = await import('@/lib/password-upgrade');
    schedulePasswordUpgrade();
  }
}
