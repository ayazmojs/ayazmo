import createError from "@fastify/error";

type ErrorOptions = {
  statusCode: number;
  message: string;
  code?: string;
};

// Error factory function
export default function AyazmoError({ statusCode, message, code }: ErrorOptions) {
  const error = createError(code || 'AYAZMO_ERROR', message, statusCode);
  return new error();
}