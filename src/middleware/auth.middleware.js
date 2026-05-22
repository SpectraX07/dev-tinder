export const adminAuth = (req, res, next) => {
  const token = 'xyz';
  const isAdminAuthenticated = token === 'xyz';

  if (!isAdminAuthenticated) {
    return res.status(401).send('Unauthorized');
  }
  next();
};
