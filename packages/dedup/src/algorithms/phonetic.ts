/**
 * Phonetic matching algorithms: Soundex & Double Metaphone.
 * Enables phonetic matching across spelling variants (e.g. "Smith" / "Smythe", "Jon" / "John").
 */

/**
 * Standard American Soundex algorithm.
 * Returns a 4-character code (1 letter + 3 numbers).
 */
export function soundex(str: string): string {
  if (!str) return "0000";
  const clean = str.toUpperCase().replace(/[^A-Z]/g, "");
  if (clean.length === 0) return "0000";

  const firstLetter = clean[0] || "";
  if (!firstLetter) return "0000";

  const mapChar = (c: string): string => {
    switch (c) {
      case "B":
      case "F":
      case "P":
      case "V":
        return "1";
      case "C":
      case "G":
      case "J":
      case "K":
      case "Q":
      case "S":
      case "X":
      case "Z":
        return "2";
      case "D":
      case "T":
        return "3";
      case "L":
        return "4";
      case "M":
      case "N":
        return "5";
      case "R":
        return "6";
      default:
        return "0";
    }
  };

  let code: string = firstLetter;
  let prevCode = mapChar(firstLetter);

  for (let i = 1; i < clean.length; i++) {
    const curChar = clean[i] || "";
    const curCode = mapChar(curChar);
    if (curCode !== "0" && curCode !== prevCode) {
      code += curCode;
    }
    prevCode = curCode;
    if (code.length === 4) break;
  }

  while (code.length < 4) {
    code += "0";
  }

  return code.slice(0, 4);
}

export interface MetaphoneResult {
  primary: string;
  secondary: string;
}

/**
 * Double Metaphone implementation for English and foreign surname phonetics.
 */
export function doubleMetaphone(input: string): MetaphoneResult {
  const str = (input || "").toUpperCase().trim();
  if (!str.length) return { primary: "", secondary: "" };

  let primary = "";
  let secondary = "";
  let current = 0;
  const length = str.length;
  const last = length - 1;

  const isVowel = (pos: number) => {
    if (pos < 0 || pos >= length) return false;
    return "AEIOUY".includes(str.charAt(pos));
  };

  const stringAt = (pos: number, len: number, ...targets: string[]) => {
    if (pos < 0 || pos + len > length) return false;
    const sub = str.substring(pos, pos + len);
    return targets.includes(sub);
  };

  // Initial silent letters
  if (stringAt(0, 2, "GN", "KN", "PN", "WR", "PS")) {
    current += 1;
  }

  // Initial X -> S
  if (str.charAt(0) === "X") {
    primary += "S";
    secondary += "S";
    current += 1;
  }

  while (current < length && (primary.length < 4 || secondary.length < 4)) {
    const char = str.charAt(current);

    switch (char) {
      case "A":
      case "E":
      case "I":
      case "O":
      case "U":
      case "Y":
        if (current === 0) {
          primary += "A";
          secondary += "A";
        }
        current += 1;
        break;

      case "B":
        primary += "P";
        secondary += "P";
        current += str[current + 1] === "B" ? 2 : 1;
        break;

      case "C":
        // Various 'C' rules
        if (stringAt(current, 2, "CH")) {
          primary += "X";
          secondary += "X";
          current += 2;
        } else if (stringAt(current, 2, "CZ")) {
          primary += "S";
          secondary += "X";
          current += 2;
        } else if (stringAt(current, 2, "CI", "CE", "CY")) {
          primary += "S";
          secondary += "S";
          current += 2;
        } else if (stringAt(current, 2, "CK")) {
          primary += "K";
          secondary += "K";
          current += 2;
        } else {
          primary += "K";
          secondary += "K";
          current += str[current + 1] === "C" ? 2 : 1;
        }
        break;

      case "D":
        if (stringAt(current, 2, "DG")) {
          if (stringAt(current + 2, 1, "I", "E", "Y")) {
            primary += "J";
            secondary += "J";
            current += 3;
          } else {
            primary += "TK";
            secondary += "TK";
            current += 2;
          }
        } else if (stringAt(current, 2, "DT", "DD")) {
          primary += "T";
          secondary += "T";
          current += 2;
        } else {
          primary += "T";
          secondary += "T";
          current += 1;
        }
        break;

      case "F":
        primary += "F";
        secondary += "F";
        current += str[current + 1] === "F" ? 2 : 1;
        break;

      case "G":
        if (str[current + 1] === "H") {
          if (current > 0 && !isVowel(current - 1)) {
            primary += "K";
            secondary += "K";
            current += 2;
          } else if (current === 0) {
            primary += "K";
            secondary += "K";
            current += 2;
          } else {
            current += 2;
          }
        } else if (str[current + 1] === "N") {
          if (current === 1 && isVowel(0)) {
            primary += "KN";
            secondary += "N";
          } else {
            primary += "N";
            secondary += "KN";
          }
          current += 2;
        } else if (stringAt(current, 2, "GE", "GI", "GY")) {
          primary += "K";
          secondary += "J";
          current += 2;
        } else {
          primary += "K";
          secondary += "K";
          current += str[current + 1] === "G" ? 2 : 1;
        }
        break;

      case "H":
        if ((current === 0 || isVowel(current - 1)) && isVowel(current + 1)) {
          primary += "H";
          secondary += "H";
          current += 2;
        } else {
          current += 1;
        }
        break;

      case "J":
        primary += "J";
        secondary += "A";
        current += str[current + 1] === "J" ? 2 : 1;
        break;

      case "K":
        primary += "K";
        secondary += "K";
        current += str[current + 1] === "K" ? 2 : 1;
        break;

      case "L":
        primary += "L";
        secondary += "L";
        current += str[current + 1] === "L" ? 2 : 1;
        break;

      case "M":
        primary += "M";
        secondary += "M";
        current += str[current + 1] === "M" ? 2 : 1;
        break;

      case "N":
        primary += "N";
        secondary += "N";
        current += str[current + 1] === "N" ? 2 : 1;
        break;

      case "P":
        if (str[current + 1] === "H") {
          primary += "F";
          secondary += "F";
          current += 2;
        } else {
          primary += "P";
          secondary += "P";
          current += stringAt(current + 1, 1, "P", "B") ? 2 : 1;
        }
        break;

      case "Q":
        primary += "K";
        secondary += "K";
        current += str[current + 1] === "Q" ? 2 : 1;
        break;

      case "R":
        primary += "R";
        secondary += "R";
        current += str[current + 1] === "R" ? 2 : 1;
        break;

      case "S":
        if (stringAt(current, 2, "SH")) {
          primary += "X";
          secondary += "X";
          current += 2;
        } else if (stringAt(current, 3, "SIO", "SIA")) {
          primary += "S";
          secondary += "X";
          current += 3;
        } else {
          primary += "S";
          secondary += "S";
          current += stringAt(current + 1, 1, "S", "Z") ? 2 : 1;
        }
        break;

      case "T":
        if (stringAt(current, 2, "TH")) {
          primary += "0"; // Theta sound
          secondary += "T";
          current += 2;
        } else if (stringAt(current, 3, "TIA", "TCH")) {
          primary += "X";
          secondary += "X";
          current += 3;
        } else {
          primary += "T";
          secondary += "T";
          current += stringAt(current + 1, 1, "T", "D") ? 2 : 1;
        }
        break;

      case "V":
        primary += "F";
        secondary += "F";
        current += str[current + 1] === "V" ? 2 : 1;
        break;

      case "W":
        if (current === 0 && str[1] === "R") {
          primary += "R";
          secondary += "R";
          current += 2;
        } else if (isVowel(current + 1)) {
          primary += "A";
          secondary += "F";
          current += 1;
        } else {
          current += 1;
        }
        break;

      case "X":
        primary += "KS";
        secondary += "KS";
        current += stringAt(current + 1, 1, "C", "X") ? 2 : 1;
        break;

      case "Z":
        primary += "S";
        secondary += "S";
        current += str[current + 1] === "Z" ? 2 : 1;
        break;

      default:
        current += 1;
        break;
    }
  }

  return {
    primary: primary.slice(0, 4),
    secondary: secondary.slice(0, 4),
  };
}

/**
 * Phonetic similarity between two names combining Soundex and Double Metaphone.
 */
export function phoneticMatch(
  s1: string,
  s2: string,
): {
  soundexMatch: boolean;
  metaphoneMatch: boolean;
  score: number;
} {
  const sx1 = soundex(s1);
  const sx2 = soundex(s2);
  const soundexMatch = sx1 === sx2 && sx1 !== "0000";

  const dm1 = doubleMetaphone(s1);
  const dm2 = doubleMetaphone(s2);

  const metaphoneMatch =
    (dm1.primary &&
      (dm1.primary === dm2.primary || dm1.primary === dm2.secondary)) ||
    (dm1.secondary &&
      (dm1.secondary === dm2.primary || dm1.secondary === dm2.secondary));

  let score = 0;
  if (soundexMatch && metaphoneMatch) {
    score = 1.0;
  } else if (metaphoneMatch) {
    score = 0.85;
  } else if (soundexMatch) {
    score = 0.7;
  }

  return {
    soundexMatch,
    metaphoneMatch: Boolean(metaphoneMatch),
    score,
  };
}
