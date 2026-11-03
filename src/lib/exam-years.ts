export const EXAM_YEAR_ENDS = Array.from({ length: 35 }, (_, index) => 1991 + index);

export function formatExamYear(year: number) {
  return `${year - 1}-${year}`;
}
