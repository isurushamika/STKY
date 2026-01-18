type DateLike = string | number | Date;

const toDate = (value: DateLike): Date => (value instanceof Date ? value : new Date(value));

export const formatDateShort = (value: DateLike, locale = 'en-US'): string => {
  return toDate(value).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateTime = (value: DateLike, locale = 'en-US'): string => {
  return toDate(value).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
