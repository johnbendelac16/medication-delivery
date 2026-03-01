import { Router } from 'express'
import { register, login, refresh, logout, me } from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

// Public routes — no token required
router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', logout)

// Protected route — requires a valid JWT token
router.get('/me', authenticate, me)

export default router
