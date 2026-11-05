export function courseDescriptionWordCount(description: string): number {
  return description.trim().split(/\s+/).filter(Boolean).length;
}

export function hasValidCourseDescriptionLength(description: string): boolean {
  const wordCount = courseDescriptionWordCount(description);
  return wordCount >= 80 && wordCount <= 250;
}
