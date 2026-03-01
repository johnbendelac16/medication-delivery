import { Router } from 'express'
import { createOrder, getMyOrders, getOrder, updateStatus } from '../controllers/order.controller'
import { authorize, UserRole } from '../middlewares/authorize.middleware'

const router = Router()

// Only PATIENT can create an order
router.post('/',            authorize(UserRole.PATIENT),                                    createOrder)
// Only PATIENT can see their own orders
router.get('/me',           authorize(UserRole.PATIENT),                                    getMyOrders)
// Any authenticated user can see an order
router.get('/:id',          authorize(UserRole.PATIENT, UserRole.PHARMACIST, UserRole.DELIVERY_DRIVER, UserRole.ADMIN), getOrder)
// Only PHARMACIST or DELIVERY_DRIVER can update status
router.patch('/:id/status', authorize(UserRole.PHARMACIST, UserRole.DELIVERY_DRIVER, UserRole.ADMIN), updateStatus)

export default router