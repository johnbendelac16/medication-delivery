import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JwtPayload, UserRole } from '../types/auth.types'

// Verifies the JWT token from the Authorization: Bearer <token> header
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    res.status(401).json({ message: 'Missing token' })
    return
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    req.user = payload  // attach decoded user to the request
    next()              // pass to the next middleware or route handler
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// Checks that the authenticated user has one of the required roles
// Usage: authorize(UserRole.PHARMACIST, UserRole.ADMIN)
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Access denied' })
      return
    }
    next()
  }
}
