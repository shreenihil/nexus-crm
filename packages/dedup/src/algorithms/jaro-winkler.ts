/**
 * Jaro and Jaro-Winkler string similarity algorithms.
 * Ideal for short strings such as personal names and company handles.
 */

export function jaroSimilarity(s1: string, s2: string): number {
  const str1 = (s1 || '').trim().toLowerCase();
  const str2 = (s2 || '').trim().toLowerCase();

  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;

  const matches1 = new Array<boolean>(len1).fill(false);
  const matches2 = new Array<boolean>(len2).fill(false);

  let matches = 0;

  // Find matching characters within window
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);

    for (let j = start; j < end; j++) {
      if (!matches2[j] && str1[i] === str2[j]) {
        matches1[i] = true;
        matches2[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) {
      k++;
    }
    if (str1[i] !== str2[k]) {
      transpositions++;
    }
    k++;
  }

  const halfTrans = transpositions / 2;
  return (
    (matches / len1 + matches / len2 + (matches - halfTrans) / matches) / 3.0
  );
}

export function jaroWinklerSimilarity(
  s1: string,
  s2: string,
  prefixScale = 0.1,
  boostThreshold = 0.7
): number {
  const str1 = (s1 || '').trim().toLowerCase();
  const str2 = (s2 || '').trim().toLowerCase();

  const jaro = jaroSimilarity(str1, str2);

  if (jaro < boostThreshold) {
    return jaro;
  }

  // Find common prefix up to 4 characters
  let commonPrefix = 0;
  const maxPrefix = Math.min(4, Math.min(str1.length, str2.length));

  for (let i = 0; i < maxPrefix; i++) {
    if (str1[i] === str2[i]) {
      commonPrefix++;
    } else {
      break;
    }
  }

  return jaro + commonPrefix * prefixScale * (1 - jaro);
}
