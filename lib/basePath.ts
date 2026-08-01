// Single source of truth for the app's deployed basePath. next.config.ts
// reads this for the Next.js basePath option; client components and API
// routes that build absolute URLs import it too, so a path rename is a
// one-line change instead of a grep-and-replace across the app.
export const BASE_PATH = "/labs/ugc_content_yorbi";
