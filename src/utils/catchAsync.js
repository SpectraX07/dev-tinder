/**
 * Wraps a route handler so returned promise rejections (and sync throws)
 * are passed to Express `next(err)` and reach your error middleware.
 *
 * @template {import('express').Request} Req
 * @template {import('express').Response} Res
 * @param {(req: Req, res: Res, next: import('express').NextFunction) => unknown} fn
 * @returns {import('express').RequestHandler}
 */
export default function catchAsync(fn) {
  return (req, res, next) => {
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (err) {
      next(err);
    }
  };
}
