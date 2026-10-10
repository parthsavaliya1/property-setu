const gujarati = "૦૧૨૩૪૫૬૭૮૯";
const devanagari = "०१२३४५६७८९";

/** Turn Gujarati and Hindi digits into English digits. Other letters stay as they are. */
export function convertIndicDigits(value: string) {
  return value.replace(/[૦-૯०-९]/g, (char) => {
    const gujaratiIndex = gujarati.indexOf(char);
    if (gujaratiIndex >= 0) return String(gujaratiIndex);
    const hindiIndex = devanagari.indexOf(char);
    if (hindiIndex >= 0) return String(hindiIndex);
    return char;
  });
}

type Mark = "hundred" | "thousand" | "lakh" | "crore" | "half";

const words = new Map<string, number | Mark>();

function add(mark: number | Mark, list: string[]) {
  for (const word of list) words.set(word, mark);
}

add(0, ["0", "zero", "oh", "શૂન્ય", "शून्य"]);
add(1, ["1", "one", "એક", "एक"]);
add(2, ["2", "two", "બે", "दो"]);
add(3, ["3", "three", "ત્રણ", "तीन"]);
add(4, ["4", "four", "ચાર", "चार"]);
add(5, ["5", "five", "પાંચ", "पांच", "पाँच"]);
add(6, ["6", "six", "છ", "छह", "छः"]);
add(7, ["7", "seven", "સાત", "सात"]);
add(8, ["8", "eight", "આઠ", "आठ"]);
add(9, ["9", "nine", "નવ", "नौ"]);
add(10, ["10", "ten", "દસ", "दस"]);
add(11, ["11", "eleven", "અગિયાર", "ग्यारह"]);
add(12, ["12", "twelve", "બાર", "बारह"]);
add(13, ["13", "thirteen", "તેર", "तेरह"]);
add(14, ["14", "fourteen", "ચૌદ", "चौदह"]);
add(15, ["15", "fifteen", "પંદર", "पंद्रह"]);
add(16, ["16", "sixteen", "સોળ", "सोलह"]);
add(17, ["17", "seventeen", "સત્તર", "सत्रह"]);
add(18, ["18", "eighteen", "અઢાર", "अठारह"]);
add(19, ["19", "nineteen", "ઓગણીસ", "उन्नीस"]);
add(20, ["20", "twenty", "વીસ", "बीस"]);
add(21, ["21", "એકવીસ", "इक्कीस"]);
add(22, ["22", "બાવીસ", "बाईस"]);
add(23, ["23", "તેવીસ", "तेईस"]);
add(24, ["24", "ચોવીસ", "चौबीस"]);
add(25, ["25", "પચ્ચીસ", "पच्चीस"]);
add(26, ["26", "છવીસ", "छब्बीस"]);
add(27, ["27", "સત્તાવીસ", "सत्ताईस"]);
add(28, ["28", "અઠ્ઠાવીસ", "अट्ठाईस"]);
add(29, ["29", "ઓગણત્રીસ", "उनतीस"]);
add(30, ["30", "thirty", "ત્રીસ", "तीस"]);
add(31, ["31", "એકત્રીસ", "इकतीस"]);
add(32, ["32", "બત્રીસ", "बत्तीस"]);
add(33, ["33", "તેત્રીસ", "तैंतीस"]);
add(34, ["34", "ચોત્રીસ", "चौंतीस"]);
add(35, ["35", "પાંત્રીસ", "पैंतीस"]);
add(36, ["36", "છત્રીસ", "छत्तीस"]);
add(37, ["37", "સડત્રીસ", "सैंतीस"]);
add(38, ["38", "આડત્રીસ", "अड़तीस"]);
add(39, ["39", "ઓગણચાલીસ", "उनतालीस"]);
add(40, ["40", "forty", "ચાલીસ", "चालीस"]);
add(41, ["41", "એકતાલીસ", "इकतालीस"]);
add(42, ["42", "બેતાલીસ", "बयालीस"]);
add(43, ["43", "ત્રેતાલીસ", "તેતાલીસ", "तैंतालीस"]);
add(44, ["44", "ચુંમાલીસ", "ચુમાલીસ", "चौवालीस"]);
add(45, ["45", "પિસ્તાલીસ", "पैंतालीस"]);
add(46, ["46", "છેતાલીસ", "छियालीस"]);
add(47, ["47", "સડતાલીસ", "સુડતાલીસ", "सैंतालीस"]);
add(48, ["48", "અડતાલીસ", "अड़तालीस"]);
add(49, ["49", "ઓગણપચાસ", "उनचास"]);
add(50, ["50", "fifty", "પચાસ", "पचास"]);
add(51, ["51", "એકાવન", "इक्यावन"]);
add(52, ["52", "બાવન", "बावन"]);
add(53, ["53", "ત્રેપન", "ત્રેપન", "तिरपन"]);
add(54, ["54", "ચોપન", "चौवन"]);
add(55, ["55", "પંચાવન", "पचपन"]);
add(56, ["56", "છપ્પન", "छप्पन"]);
add(57, ["57", "સત્તાવન", "सत्तावन"]);
add(58, ["58", "અઠ્ઠાવન", "अट्ठावन"]);
add(59, ["59", "ઓગણસાઠ", "उनसठ"]);
add(60, ["60", "sixty", "સાઠ", "साठ"]);
add(61, ["61", "એકસઠ", "इकसठ"]);
add(62, ["62", "બાસઠ", "बासठ"]);
add(63, ["63", "ત્રેસઠ", "तिरसठ"]);
add(64, ["64", "ચોસઠ", "चौंसठ"]);
add(65, ["65", "પાંસઠ", "पैंसठ"]);
add(66, ["66", "છાસઠ", "छियासठ"]);
add(67, ["67", "સડસઠ", "सड़सठ"]);
add(68, ["68", "અડસઠ", "अड़सठ"]);
add(69, ["69", "ઓગણોતેર", "उनहत्तर"]);
add(70, ["70", "seventy", "સિત્તેર", "सत्तर"]);
add(71, ["71", "એકોતેર", "इकहत्तर"]);
add(72, ["72", "બોતેર", "बहत्तर"]);
add(73, ["73", "તોતેર", "तिहत्तर"]);
add(74, ["74", "ચુમોતેર", "चौहत्तर"]);
add(75, ["75", "પંચોતેર", "पचहत्तर"]);
add(76, ["76", "છોતેર", "छिहत्तर"]);
add(77, ["77", "સિત્યોતેર", "सतहत्तर"]);
add(78, ["78", "અઠ્યોતેર", "अठहत्तर"]);
add(79, ["79", "ઓગણાએંસી", "उन्यासी"]);
add(80, ["80", "eighty", "એંસી", "अस्सी"]);
add(81, ["81", "એક્યાસી", "इक्यासी"]);
add(82, ["82", "બ્યાસી", "बयासी"]);
add(83, ["83", "ત્યાસી", "तिरासी"]);
add(84, ["84", "ચોર્યાસી", "चौरासी"]);
add(85, ["85", "પંચ્યાસી", "पचासी"]);
add(86, ["86", "છ્યાસી", "छियासी"]);
add(87, ["87", "સિત્યાસી", "सतासी"]);
add(88, ["88", "અઠ્યાસી", "अठासी"]);
add(89, ["89", "નેવ્યાસી", "नवासी"]);
add(90, ["90", "ninety", "નેવું", "नब्बे"]);
add(91, ["91", "એકાણું", "इक्यानवे"]);
add(92, ["92", "બાણું", "बानवे"]);
add(93, ["93", "ત્રાણું", "तिरानवे"]);
add(94, ["94", "ચોરાણું", "चौरानवे"]);
add(95, ["95", "પંચાણું", "पचानवे"]);
add(96, ["96", "છન્નું", "छियानवे"]);
add(97, ["97", "સત્તાણું", "सतानवे"]);
add(98, ["98", "અઠ્ઠાણું", "अट्ठानवे"]);
add(99, ["99", "નવ્વાણું", "निन्यानवे"]);
add(1.5, ["dedh", "ડેઢ", "डेढ़"]);
add(2.5, ["adhi", "અઢી", "ढाई"]);
add("hundred", ["hundred", "so", "સો", "सौ"]);
add("thousand", ["thousand", "hazaar", "hajar", "હજાર", "હજારો", "हजार"]);
add("lakh", ["lakh", "lakhs", "lac", "lacs", "લાખ", "લાખો", "लाख"]);
add("crore", ["crore", "crores", "karod", "કરોડ", "કરોડો", "करोड़", "करोड"]);
add("half", ["sada", "sadha", "સાડા", "साढ़े", "साढे"]);

const skip = new Set([
  "and", "only", "rupee", "rupees", "rs", "inr",
  "અને", "ફક્ત", "રૂપિયા", "રૂપિયો",
  "और", "aur", "रुपये", "रुपया",
]);

function tokens(value: string) {
  return convertIndicDigits(value)
    .toLowerCase()
    .replace(/[₹,]/g, " ")
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function asNumber(token: string) {
  if (/^\d+(\.\d+)?$/.test(token)) return Number(token);
  const known = words.get(token);
  return typeof known === "number" ? known : null;
}

/** Read an Indian amount such as "સડતાલીસ લાખ" or "47 lakh" into a number. */
export function parseSpokenAmount(value: string) {
  let total = 0;
  let current = 0;
  let half = false;
  let saw = false;

  for (const token of tokens(value)) {
    if (skip.has(token)) continue;
    const known = words.get(token);
    if (known === "half") {
      half = true;
      continue;
    }
    if (known === "hundred" || known === "thousand" || known === "lakh" || known === "crore") {
      const multiplier = known === "hundred" ? 100 : known === "thousand" ? 1000 : known === "lakh" ? 100000 : 10000000;
      const base = current || 1;
      if (known === "hundred") current = base * multiplier;
      else {
        total += base * multiplier;
        current = 0;
      }
      saw = true;
      half = false;
      continue;
    }
    const number = asNumber(token);
    if (number == null) continue;
    const next = half ? number + 0.5 : number;
    half = false;
    if (current === 0) current = next;
    else if (next < 10 && current >= 20 && current % 10 === 0) current += next;
    else if (next < 100 && current % 100 === 0) current += next;
    else current = next;
    saw = true;
  }

  if (!saw) return null;
  const amount = total + current;
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount);
}

function digitSequence(value: string) {
  const parts = tokens(value).filter((token) => !skip.has(token));
  if (!parts.length) return null;
  const digits = parts.map((token) => {
    const number = asNumber(token);
    return number != null && number >= 0 && number <= 9 && Number.isInteger(number) ? String(number) : null;
  });
  if (digits.every(Boolean)) return digits.join("");
  return null;
}

export type SpokenKind = "text" | "digits" | "amount";

export function spokenKindForKeyboard(keyboardType?: string | null, spoken?: SpokenKind): SpokenKind {
  if (spoken) return spoken;
  if (keyboardType === "number-pad" || keyboardType === "numeric" || keyboardType === "phone-pad" || keyboardType === "decimal-pad") return "digits";
  return "text";
}

/** Shape typed or spoken text so number fields stay valid English digits. */
export function shapeSpoken(value: string, kind: SpokenKind) {
  if (kind === "text") return convertIndicDigits(value);
  if (!value.trim()) return "";
  if (kind === "digits") {
    const sequence = digitSequence(value);
    if (sequence != null) return sequence;
    const digits = convertIndicDigits(value).replace(/\D/g, "");
    if (digits) return digits;
    const amount = parseSpokenAmount(value);
    return amount == null ? "" : String(amount);
  }
  const compact = convertIndicDigits(value).replace(/[₹,\s]/g, "");
  if (/^\d*\.?\d*$/.test(compact)) return compact;
  const amount = parseSpokenAmount(value);
  if (amount != null) return String(amount);
  return convertIndicDigits(value).replace(/\D/g, "");
}
