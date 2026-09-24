import { z } from "zod";
import { tx } from "@/i18n/tx";

/** Localizes zod's built-in messages; explicit schema messages still take precedence. */
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") return { message: tx("validation.required") };
      break;
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") return { message: Number(issue.minimum) <= 1 ? tx("validation.required") : tx("validation.tooShort", { min: Number(issue.minimum) }) };
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: tx("validation.tooLong", { max: Number(issue.maximum) }) };
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: tx("validation.invalidEmail") };
      if (issue.validation === "url") return { message: tx("validation.invalidUrl") };
      return { message: tx("validation.invalid") };
  }
  return { message: ctx.defaultError };
});
