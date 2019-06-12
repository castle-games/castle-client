import * as React from 'react';

import { Value } from 'slate';

import Plain from 'slate-plain-serializer';

export const getPresentationName = (user) => {
  if (isEmpty(user.name)) {
    return user.username;
  }

  if (user.name === user.username) {
    return user.username;
  }

  return <React.Fragment>{user.name} <span style={{ fontWeight: 400, fontSize: `10px`}}>({user.username})</span></React.Fragment>;
}

export const elide = (string, length = 140) => {
  if (isEmpty(string)) {
    return '...';
  }

  if (string.length < length) {
    return string.trim();
  }

  return `${string.substring(0, length)}...`;
};

export const toDirectoryName = (str) => {
  if (str) {
    return str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '-');
  }
  return null;
};

const areDatesSameDay = (date1, date2) => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

export const toChatDate = (timestamp) => {
  let date = new Date(timestamp);
  let timeString = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  if (!areDatesSameDay(new Date(), date)) {
    let yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

    if (areDatesSameDay(yesterday, date)) {
      timeString = `Yesterday ${timeString}`;
    } else {
      timeString = `${toDate(date)} ${timeString}`;
    }
  }

  return timeString;
};

export const toDate = (dateString) => {
  let date = dateString;
  if (typeof dateString !== 'object') {
    date = new Date(dateString);
  }

  return `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`;
};

export const isEmpty = (string) => {
  return !string || string.length === 0;
};

export const pluralize = (text, count) => {
  return count > 1 || count === 0 ? `${text}s` : text;
};

export const loadEditor = (text) => {
  // NOTE(jim): Its not clear to me when something decides to be a string.
  if (typeof text === 'string') {
    const parsedText = JSON.parse(text);
    if (typeof parsedText === 'object') {
      return Value.fromJSON(parsedText);
    }

    throw new Error('Text parsing failed. Critical error');
  }

  return Value.fromJSON(text);
};

export const isRichTextEmpty = (val) => {
  return !val || !Value.isValue(val) || val.document.text.length == 0;
};
