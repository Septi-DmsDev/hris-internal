export function formatOneDecimal(value: string | number) {
  const num = Number(value);
  if (Number.isNaN(num)) return "0,0";
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatPointNumber(value: string | number) {
  const num = Number(value);
  if (Number.isNaN(num)) return "0";
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 1,
    maximumFractionDigits: 2,
  });
}
