import { z } from "zod";

// Strips control characters and angle brackets (basic XSS/log-injection guard).
export function cleanString(input: string): string {
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim();
}

const cleanedString = (max = 2000) =>
  z
    .string()
    .transform((v) => cleanString(v))
    .pipe(z.string().min(1).max(max));

const optionalCleanedString = (max = 2000) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : cleanString(v)))
    .pipe(z.string().max(max).optional());

export const DOMAIN_VALUES = [
  "tech",
  "marketing",
  "media",
  "design",
  "events",
] as const;

export const applicationSchema = z
  .object({
    fullName: cleanedString(200),
    srn: cleanedString(30),
    branch: cleanedString(100),
    year: cleanedString(20),
    email: z.string().email().max(200),
    phone: cleanedString(20),
    domains: z
      .array(z.enum(DOMAIN_VALUES))
      .min(1, "Select at least one domain"),
    domainAnswers: z.record(z.string(), z.unknown()).optional(),
    experience: optionalCleanedString(4000),
    portfolioUrl: z
      .string()
      .url()
      .max(500)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    whyJoin: optionalCleanedString(4000),

    // Tech domain fields
    techCyberExperience: optionalCleanedString(4000),
    techLanguage: optionalCleanedString(500),
    techWhyDomain: optionalCleanedString(4000),
    techPriorExperience: optionalCleanedString(4000),
    techCtfParticipated: optionalCleanedString(20),
    techCtfOther: optionalCleanedString(2000),
    techCtfConfidence: optionalCleanedString(500),
    techGithub: optionalCleanedString(500),
    techLinkedin: optionalCleanedString(500),
    techProject: optionalCleanedString(4000),

    // Events domain fields
    eventsWhyJoin: optionalCleanedString(4000),
    eventsPriorExperience: optionalCleanedString(4000),
    eventsPlanSteps: optionalCleanedString(4000),
    eventsOrientationIdeas: optionalCleanedString(4000),
    eventsExcites: optionalCleanedString(4000),

    // Marketing domain fields
    marketingWhyDomain: optionalCleanedString(4000),
    marketingExperience: optionalCleanedString(4000),
    marketingConfidence: optionalCleanedString(500),

    // Media domain fields
    mediaWhyDomain: optionalCleanedString(4000),
    mediaTools: optionalCleanedString(500),
    mediaPortfolio: optionalCleanedString(500),

    // Design domain fields
    designWhyDomain: optionalCleanedString(4000),
    designTools: optionalCleanedString(500),
    designConfidence: optionalCleanedString(500),

    feedback: optionalCleanedString(4000),

    // Honeypot — must stay empty. Bots that fill every field trip this.
    website: z.string().max(0, "Bot detected").optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.domains.includes("tech")) {
      const requiredTechFields: Array<keyof typeof data> = [
        "techWhyDomain",
        "techPriorExperience",
      ];
      for (const field of requiredTechFields) {
        if (!data[field] || String(data[field]).length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field as string],
            message: `${String(field)} is required when applying to the Tech domain`,
          });
        }
      }
    }

    if (data.domains.includes("events")) {
      const requiredEventsFields: Array<keyof typeof data> = [
        "eventsWhyJoin",
        "eventsPriorExperience",
      ];
      for (const field of requiredEventsFields) {
        if (!data[field] || String(data[field]).length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field as string],
            message: `${String(field)} is required when applying to the Events domain`,
          });
        }
      }
    }

    if (data.domains.includes("marketing")) {
      const requiredMarketingFields: Array<keyof typeof data> = [
        "marketingWhyDomain",
        "marketingConfidence",
      ];
      for (const field of requiredMarketingFields) {
        if (!data[field] || String(data[field]).length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field as string],
            message: `${String(field)} is required when applying to the Marketing domain`,
          });
        }
      }
    }

    if (data.domains.includes("media")) {
      const requiredMediaFields: Array<keyof typeof data> = ["mediaWhyDomain"];
      for (const field of requiredMediaFields) {
        if (!data[field] || String(data[field]).length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field as string],
            message: `${String(field)} is required when applying to the Media domain`,
          });
        }
      }
    }

    if (data.domains.includes("design")) {
      const requiredDesignFields: Array<keyof typeof data> = [
        "designWhyDomain",
        "designConfidence",
      ];
      for (const field of requiredDesignFields) {
        if (!data[field] || String(data[field]).length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field as string],
            message: `${String(field)} is required when applying to the Design domain`,
          });
        }
      }
    }
  });

export type ApplicationInput = z.infer<typeof applicationSchema>;
