import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// ============ ZOD SCHEMAS ============

/**
 * Schema validasi untuk POST /api/payment/checkout
 * Memastikan grossAmount dan item prices/quantities tidak bisa dimanipulasi
 */
export const checkoutSchema = z.object({
  orderId: z.string().min(1, "orderId wajib diisi"),
  grossAmount: z
    .number({ error: "grossAmount harus berupa angka positif" })
    .positive("grossAmount harus bernilai positif"),
  customerName: z.string().optional(),
  customerEmail: z.string().email("Format email tidak valid").optional(),
  customerPhone: z.string().optional(),
  items: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]).optional(),
        product_id: z.union([z.string(), z.number()]).optional(),
        price: z
          .number({ error: "price harus berupa angka positif" })
          .positive("price harus bernilai positif"),
        quantity: z
          .number({ error: "quantity harus berupa angka" })
          .int("quantity harus bilangan bulat")
          .positive("quantity harus bernilai positif")
          .max(999, "quantity maksimal 999"),
        name: z.string().optional(),
        product_name: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * Schema validasi untuk POST /api/orders (createOrderAndPayment)
 * Validasi ketat pada item variant_id dan quantity untuk mencegah manipulasi payload
 */
export const createOrderSchema = z.object({
  orderId: z.string().min(1, "orderId wajib diisi"),
  items: z
    .array(
      z.object({
        variant_id: z
          .number({ error: "variant_id harus berupa angka positif" })
          .int("variant_id harus bilangan bulat")
          .positive("variant_id harus bernilai positif"),
        quantity: z
          .number({ error: "quantity harus berupa angka" })
          .int("quantity harus bilangan bulat")
          .positive("quantity harus bernilai positif")
          .max(100, "quantity maksimal 100 per item"),
        name: z.string().optional(),
        product_name: z.string().optional(),
        bundle_selections: z
          .array(
            z.object({
              product_id: z.number().int().positive(),
              variant_id: z.number().int().positive(),
              quantity: z.number().int().positive().optional().default(1),
            })
          )
          .optional(),
      })
    )
    .min(1, "Minimal 1 item dalam pesanan"),
  customerName: z.string().min(1, "Nama pelanggan wajib diisi"),
  customerEmail: z.string().email("Format email tidak valid"),
  customerPhone: z.string().min(1, "Nomor telepon wajib diisi"),
  userId: z.union([z.string(), z.number()]).optional().nullable(),
  customerNim: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  channel: z.string().optional(),
  fulfillmentType: z.string().optional(),
  shippingCost: z
    .number()
    .min(0, "shippingCost tidak boleh negatif")
    .optional()
    .default(0),
  serviceFee: z
    .number()
    .min(0, "serviceFee tidak boleh negatif")
    .optional()
    .default(0),
  taxAmount: z
    .number()
    .min(0, "taxAmount tidak boleh negatif")
    .optional()
    .default(0),
  discountAmount: z
    .number()
    .min(0, "discountAmount tidak boleh negatif")
    .optional()
    .default(0),
  notes: z.string().optional().nullable(),
});

// ============ MIDDLEWARE FACTORY ============

/**
 * Express middleware factory yang memvalidasi req.body terhadap Zod schema.
 * Mengembalikan 400 Bad Request dengan detail error jika validasi gagal.
 */
export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      console.warn(
        `[Validation] Request body rejected for ${req.method} ${req.path}:`,
        JSON.stringify(errors)
      );

      return res.status(400).json({
        success: false,
        error: "Validasi input gagal",
        details: errors,
      });
    }

    // Replace req.body with parsed (and coerced) data
    req.body = result.data;
    next();
  };
}
