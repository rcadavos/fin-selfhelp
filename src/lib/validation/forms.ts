import { z } from "zod";

export const emailSchema = z.email("Enter a valid email address.").trim();

export const passwordSchema = z.string().min(6, "Password must be at least 6 characters.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: passwordSchema,
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export const goalTypeSchema = z.enum(["short_term", "long_term", "lifetime"]);

export const goalInputSchema = z
  .object({
    name: z.string().trim().min(1, "Goal name is required."),
    date_set_month: z.number().int().min(1, "Date set: choose a valid month.").max(12, "Date set: choose a valid month."),
    date_set_year: z.number().int().min(1900, "Date set: choose a valid year.").max(2100, "Date set: choose a valid year."),
    date_achieved_month: z.number().int().min(1, "Invalid month.").max(12, "Invalid month.").nullable(),
    date_achieved_year: z.number().int().min(1900, "Invalid year.").max(2100, "Invalid year.").nullable(),
    goal_type: goalTypeSchema,
    notes: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
    if ((v.date_achieved_month == null) !== (v.date_achieved_year == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set both month and year for date achieved, or leave both empty.",
        path: ["date_achieved_month"],
      });
    }
  });

export const categoryCreateSchema = z.object({
  id: z.string().trim().min(1, "ID is required."),
  label: z.string().trim().min(1, "Label is required."),
  bgClass: z.string().optional(),
});

export const feedbackSuggestionSchema = z.object({
  email: z.email("Enter a valid email address.").trim().nullable().optional(),
  content: z.string().trim().min(2, "Please enter a suggestion (at least 2 characters)."),
});

export const feedbackReviewSchema = z.object({
  authorName: z.string().trim().nullable().optional(),
  content: z.string().trim().min(2, "Please enter your review (at least 2 characters)."),
  rating: z.number().int().min(1).max(5).nullable().optional(),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().max(120, "Name is too long.").optional(),
  phone: z.string().trim().max(40, "Phone is too long.").optional(),
});

export const sharingInviteSchema = z
  .object({
    inviteEmail: emailSchema,
    canViewExpenses: z.boolean(),
    canViewToBuy: z.boolean(),
  })
  .refine((v) => v.canViewExpenses || v.canViewToBuy, {
    message: "Select at least one area to share.",
    path: ["canViewExpenses"],
  });

export const expenseAmountSchema = z.number().int().positive("Amount must be greater than 0.");

export const expenseFormSchema = z.object({
  name: z.string().trim().min(1, "Label is required."),
  amount: expenseAmountSchema,
});
