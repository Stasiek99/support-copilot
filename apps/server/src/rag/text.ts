const STOPWORDS = new Set(
  `
  a about after again all also am an and any are as at be been but by can could did do does for
  from had has have he her here him his how i if in into is it its just me my no not now of on or
  our out please she so than that the their them then there they this to up us was we were what
  when which who will with would you your
  `
    .split(/\s+/)
    .filter(Boolean),
);

export function stem(token: string): string {
  let word = token;
  if (word.length > 4 && word.endsWith('ies')) word = `${word.slice(0, -3)}y`;
  else if (word.length > 5 && word.endsWith('ing')) word = word.slice(0, -3);
  else if (word.length > 4 && word.endsWith('ed')) word = word.slice(0, -2);
  else if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) word = word.slice(0, -1);
  if (word.length > 4 && word.endsWith('e')) word = word.slice(0, -1);
  return word;
}

export function tokenize(text: string): string[] {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.filter((word) => word.length > 1 && !STOPWORDS.has(word)).map(stem);
}
