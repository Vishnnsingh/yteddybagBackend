import dayjs from 'dayjs';

export const now = (): string => dayjs().toISOString();

export const slugify = (value = ''): string =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
