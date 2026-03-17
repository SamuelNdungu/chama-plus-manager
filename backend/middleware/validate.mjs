/**
 * Validation middleware helper
 */

import { validationResult } from 'express-validator';

export function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}
