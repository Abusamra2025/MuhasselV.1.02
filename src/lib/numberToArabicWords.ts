// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
/**
 * Arabic Number To Words Converter (Tafqeet - تفقيط المبالغ المالية)
 * Converts numbers to Arabic words for official vouchers and receipts.
 */

const ones = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
];

const tens = [
  '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'
];

const hundreds = [
  '', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'
];

function convertGroup(n: number): string {
  let str = '';
  const h = Math.floor(n / 100);
  const remainder = n % 100;

  if (h > 0) {
    str += hundreds[h];
  }

  if (remainder > 0) {
    if (str.length > 0) str += ' و';
    if (remainder < 20) {
      str += ones[remainder];
    } else {
      const o = remainder % 10;
      const t = Math.floor(remainder / 10);
      if (o > 0) {
        str += ones[o] + ' و' + tens[t];
      } else {
        str += tens[t];
      }
    }
  }

  return str;
}

export function tafqeet(amount: number, currency = 'ريال سعودي', halala = 'هللة'): string {
  if (amount === 0) return `صفر ${currency} فقط لا غير`;
  if (amount < 0) return `سالب ` + tafqeet(Math.abs(amount), currency, halala);

  const rounded = Math.round(amount * 100) / 100;
  const integerPart = Math.floor(rounded);
  const fractionPart = Math.round((rounded - integerPart) * 100);

  let result = '';

  const billions = Math.floor(integerPart / 1000000000);
  let rem = integerPart % 1000000000;
  const millions = Math.floor(rem / 1000000);
  rem = rem % 1000000;
  const thousands = Math.floor(rem / 1000);
  const units = rem % 1000;

  if (billions > 0) {
    result += convertGroup(billions) + ' مليار';
  }

  if (millions > 0) {
    if (result.length > 0) result += ' و';
    if (millions === 1) result += 'مليون';
    else if (millions === 2) result += 'مليونان';
    else if (millions >= 3 && millions <= 10) result += convertGroup(millions) + ' ملايين';
    else result += convertGroup(millions) + ' مليون';
  }

  if (thousands > 0) {
    if (result.length > 0) result += ' و';
    if (thousands === 1) result += 'ألف';
    else if (thousands === 2) result += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) result += convertGroup(thousands) + ' آلاف';
    else result += convertGroup(thousands) + ' ألف';
  }

  if (units > 0) {
    if (result.length > 0) result += ' و';
    result += convertGroup(units);
  }

  result = result.trim();
  if (result.length === 0) {
    result = 'صفر';
  }

  let finalPhrase = `فقط ${result} ${currency}`;

  if (fractionPart > 0) {
    finalPhrase += ` و${convertGroup(fractionPart)} ${halala}`;
  }

  return finalPhrase + ' لا غير';
}

export function formatCurrency(amount: number, showSymbol = true): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);

  return showSymbol ? `${formatted} ر.س` : formatted;
}
