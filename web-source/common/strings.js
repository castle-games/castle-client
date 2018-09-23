export const elide = (string, length = 140) => {
  if (isEmpty(string)) {
    return '...';
  }

  if (string.length < length) {
    return string.trim();
  }

  return `${string.substring(0, length)}...`;
};

export const toDate = dateString => {
  console.log(typeof dateString);
  let date = dateString;
  if (typeof dateString !== 'object') {
    date = new Date(dateString);
  }

  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
};

export const isEmpty = string => {
  return !string || string.length === 0;
};

export const pluralize = (text, count) => {
  return count > 1 || count === 0 ? `${text}s` : text;
};
