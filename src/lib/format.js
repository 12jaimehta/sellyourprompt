export function money(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format((cents || 0) / 100);
}

export const CATEGORIES = ["Writing", "Coding", "Marketing", "Image", "Business", "Other"];
export const MODELS = ["ChatGPT", "Claude", "Gemini", "Midjourney", "DALL·E", "Other"];
