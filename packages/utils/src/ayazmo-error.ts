import createError from '@fastify/error'

interface ErrorOptions {
  statusCode: number
  message: string
  code?: string
}

// Error factory function
export default function AyazmoError ({ statusCode, message, code }: ErrorOptions): Error {
  const errorCode = code ?? 'AYAZMO_ERROR'
  const ErrorConstructor = createError(errorCode, message, statusCode)
  return new ErrorConstructor()
}
