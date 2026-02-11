export type ContentType = "text" | "instagram" | "youtube" | "link"

const INSTAGRAM_REGEX = /https?:\/\/(www\.)?(instagram\.com|instagr\.am)\//i
const YOUTUBE_REGEX = /https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi

export function detectContentType(content: string): ContentType {
  if (INSTAGRAM_REGEX.test(content)) return "instagram"
  if (YOUTUBE_REGEX.test(content)) return "youtube"
  if (URL_REGEX.test(content)) return "link"
  return "text"
}

export function extractUrls(content: string): string[] {
  const matches = content.match(URL_REGEX)
  if (!matches) return []
  return [...new Set(matches)]
}

export const contentTypeLabels: Record<ContentType, string> = {
  text: "Text",
  instagram: "Instagram",
  youtube: "YouTube",
  link: "Odkaz",
}

export const contentTypeIcons: Record<ContentType, string> = {
  text: "",
  instagram: "IG",
  youtube: "YT",
  link: "",
}

export const contentTypeFilterOptions = [
  { value: "all", label: "Vsechny typy" },
  { value: "text", label: "Text" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "link", label: "Odkazy" },
]
