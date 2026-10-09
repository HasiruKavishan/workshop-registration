export const isUniqueViolation = (e: any) => e?.code === '23505' || e?.driverError?.code === '23505';
