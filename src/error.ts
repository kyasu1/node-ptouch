import express from 'express';
import boom from '@hapi/boom';

export function handleError(
  err,
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (res.headersSent) {
    return next(err);
  }

  if (!err.statusCode) {
    err = boom.boomify(err);
  }

  if (err.isServer) {
  }

  err.isBoom
    ? res.status(err.output.statusCode).json(err.output.payload)
    : res.status(err.statusCode).json(err);
};
