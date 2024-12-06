/**
 * Checks if a given value is a non-empty string.
 *
 * @param {unknown} value The value to be checked.
 * @return {boolean} True if the value is a non-empty string, false otherwise.
 */
function isNonEmptyString (value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export { isNonEmptyString }
