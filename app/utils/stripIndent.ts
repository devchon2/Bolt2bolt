export function stripIndents(strings: TemplateStringsArray, ...values: any[]) {
  const fullString = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');

  const match = fullString.match(/^[ \t]*(?=\S)/gm);
  if (!match) {
    return fullString;
  }

  const indent = Math.min(...match.map(el => el.length));
  const regex = new RegExp(`^[ \\t]{${indent}}`, 'gm');

  return indent > 0 ? fullString.replace(regex, '') : fullString;
}
