import type { ErrorRequestHandler } from 'express';
import env from '../config/env';
import logger from '../config/logger';
import AppError from '../utils/AppError';

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const error = err as AppError;
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal Server Error';

  logger.error(`${req.method} ${req.originalUrl} — ${error.message}`, {
    stack: error.stack,
    statusCode,
  });

  const payload: {
    success: false;
    message: string;
    details?: string[] | null;
    stack?: string;
  } = {
    success: false,
    message,
  };

  if (error.details) payload.details = error.details;
  if (env.isDev && error.stack) payload.stack = error.stack;

  res.status(statusCode).json(payload);
};

export default errorHandler;
