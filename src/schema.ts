import { z } from 'zod';

const sourceNameRegex = /^[A-Za-z0-9_-]+$/;

const captionStyleSchema = z
  .object({
    position: z.enum(['top', 'bottom', 'none']),
    format: z.string()
  })
  .strict();

const styleOverrideSchema = z
  .object({
    reference: z
      .object({
        format: z.string().optional()
      })
      .strict()
      .optional(),
    citation: z
      .object({
        format: z.string().optional(),
        itemSep: z.string().optional(),
        hyphen: z.string().optional()
      })
      .strict()
      .optional(),
    figCaption: captionStyleSchema.partial().strict().optional(),
    tabCaption: captionStyleSchema.partial().strict().optional()
  })
  .strict();

const issueSchema = z
  .object({
    year: z.string(),
    month: z.string().optional(),
    day: z.string().optional(),
    volume: z.string().optional(),
    issue: z.string().optional(),
    pages: z.union([z.string(), z.tuple([z.number(), z.number()])]).optional(),
    articleId: z.string().optional()
  })
  .strict();

const referenceEntrySchema = z
  .object({
    authors: z.union([z.string(), z.array(z.string())]).optional(),
    title: z.string().optional(),
    journal: z.string().optional(),
    issue: z.union([z.string(), issueSchema]).optional(),
    literal: z.string().optional()
  })
  .passthrough();

const figureSubItemSchema = z
  .object({
    name: z.string().optional(),
    resolution: z.number().int().positive().optional(),
    webResolution: z.number().int().positive().optional()
  })
  .strict();

const figureEntrySchema = z
  .object({
    caption: z.string(),
    resolution: z.number().int().positive().optional(),
    webResolution: z.number().int().positive().optional(),
    subFigures: z.array(figureSubItemSchema).optional()
  })
  .strict();

const tableEntrySchema = z
  .object({
    caption: z.string(),
    content: z.string().optional()
  })
  .strict();

export const maronConfigSchema = z
  .object({
    sources: z
      .record(
        z.string().regex(sourceNameRegex, 'must match [A-Za-z0-9_-]'),
        z
          .object({
            src: z.string().min(1),
            main: z.boolean().optional()
          })
          .strict()
      )
      .refine(v => Object.keys(v).length > 0, {
        message: '"sources" must contain at least one source entry.'
      })
  })
  .strict()
  .superRefine((config, ctx) => {
    let mainCount = 0;
    for (const [name, source] of Object.entries(config.sources)) {
      if (name === 'updates') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '"updates" is reserved and cannot be used as a source name.',
          path: ['sources', name]
        });
      }
      if (source.main) mainCount++;
    }
    if (mainCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only one source can be main=true.',
        path: ['sources']
      });
    }
  });

export const stylesSchema = styleOverrideSchema;
export const referencesSchema = z.record(z.string(), referenceEntrySchema);
export const figuresSchema = z.record(z.string(), figureEntrySchema);
export const tablesSchema = z.record(z.string(), tableEntrySchema);

export const formatZodError = (fileName: string, err: z.ZodError) => {
  const lines = err.issues.map(issue => {
    const path = issue.path.length ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
  return `Invalid ${fileName}:\n${lines.join('\n')}`;
};
