import { z } from "zod";
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/src/constants";

export const jdFileSchema = z.object({
  file: z
    .instanceof(File, { message: "Please select a file" })
    .refine(
      (file) => file.size <= MAX_FILE_SIZE,
      `File size must be less than 20MB`
    )
    .refine(
      (file) => ACCEPTED_FILE_TYPES.includes(file.type),
      "Only PDF files are accepted"
    )
    .refine(
      (file) => file.name.toLowerCase().endsWith(".pdf"),
      "File must have a .pdf extension"
    ),
});

export type JDFileInput = z.infer<typeof jdFileSchema>;
