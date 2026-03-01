import { Request, Response, NextFunction } from 'express'

// Available roles — must match the enum in auth-service
export enum UserRole {
  PATIENT           = 'PATIENT',
  PHARMACIST        = 'PHARMACIST',
  DELIVERY_DRIVER   = 'DELIVERY_DRIVER',
  ADMIN             = 'ADMIN'
}

// Middleware factory — pass allowed roles, blocks anyone else
// Usage: router.post('/', authorize(UserRole.PATIENT), createOrder)
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const xUser = req.headers['x-user']

    if (!xUser) {
      res.status(401).json({ message: 'Unauthorized — missing user context' })
      return
    }

    const user = JSON.parse(xUser as string)

    if (!allowedRoles.includes(user.role as UserRole)) {
      res.status(403).json({
        message: `Forbidden — required role: ${allowedRoles.join(' or ')}, your role: ${user.role}`
      })
      return
    }

    next()
  }
}