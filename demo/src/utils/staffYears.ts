export const calculateYearsAtMmpns = (startedAtMmpns?: string, fallbackYears = 0) => {
  if (!startedAtMmpns) {
    return Math.max(0, fallbackYears);
  }

  const startDate = new Date(startedAtMmpns);
  if (Number.isNaN(startDate.getTime())) {
    return Math.max(0, fallbackYears);
  }

  const today = new Date();
  let years = today.getFullYear() - startDate.getFullYear();

  const hasNotReachedAnniversary =
    today.getMonth() < startDate.getMonth() ||
    (today.getMonth() === startDate.getMonth() && today.getDate() < startDate.getDate());

  if (hasNotReachedAnniversary) {
    years -= 1;
  }

  return Math.max(0, years);
};
