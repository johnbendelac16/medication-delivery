import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'

const authService = new AuthService()

// POST /auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await authService.register(req.body)
    res.status(201).json({ message: 'Account created successfully', user })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// POST /auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const tokens = await authService.login(req.body)
    res.status(200).json(tokens)
  } catch (error: any) {
    res.status(401).json({ message: error.message })
  }
}

// POST /auth/refresh
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token missing' })
      return
    }
    const tokens = await authService.refresh(refreshToken)
    res.status(200).json(tokens)
  } catch (error: any) {
    res.status(401).json({ message: error.message })
  }
}

// POST /auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    await authService.logout(req.body.refreshToken)
    res.status(200).json({ message: 'Logged out successfully' })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// GET /auth/me — returns the current authenticated user from the JWT
export const me = (req: Request, res: Response): void => {
  res.status(200).json({ user: req.user })
}
