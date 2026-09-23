/**
 * Builds a short class code from a class name.
 * "Class 9" / "9-A" → "09"; "Nursery" → "NUR"; "Prep" → "PREP"
 */
export function classCodeFromName(name: string): string {
  const digits = name.match(/\d+/);
  if (digits) {
    return digits[0].padStart(2, '0').slice(0, 4);
  }
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return (letters || 'GEN').slice(0, 6);
}

/**
 * Admission number format: {YYYY}-{CLASSCODE}-{SEQ}
 * Example: 2026-09-0001, 2026-NUR-0003
 */
export async function generateAdmissionNumber(
  tx: {
    class: { findUnique: (args: any) => Promise<{ name: string } | null> };
    studentRecord: {
      findMany: (args: any) => Promise<{ admissionNumber: string | null }[]>;
    };
  },
  schoolId: string,
  classId: string,
  startYear: string
): Promise<string> {
  const cls = await tx.class.findUnique({
    where: { id: classId },
    select: { name: true },
  });

  if (!cls) {
    throw new Error('Class is required to generate admission number');
  }

  const year = (startYear || String(new Date().getFullYear())).trim();
  const code = classCodeFromName(cls.name);
  const prefix = `${year}-${code}-`;

  if ('$executeRaw' in tx) {
    await (tx as { $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> })
      .$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${schoolId}:${prefix}`})::bigint)`;
  }

  const existing = await tx.studentRecord.findMany({
    where: {
      admissionNumber: { startsWith: prefix },
      user: { schoolId },
    },
    select: { admissionNumber: true },
  });

  let maxSeq = 0;
  for (const row of existing) {
    const suffix = row.admissionNumber?.slice(prefix.length) || '';
    const n = parseInt(suffix, 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }

  const next = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${next}`;
}
