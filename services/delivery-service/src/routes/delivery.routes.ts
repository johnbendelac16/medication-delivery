import { Router } from 'express'
import {
  createDelivery,
  getDelivery,
  getDeliveryByOrder,
  updateLocation,
  updateStatus
} from '../controllers/delivery.controller'
import { authorize, UserRole } from '../middlewares/authorize.middleware'

const router = Router()

// Only PHARMACIST can create a delivery
router.post('/',                    authorize(UserRole.PHARMACIST, UserRole.ADMIN),          createDelivery)
// PATIENT, PHARMACIST, DRIVER can see a delivery
router.get('/:id',                  authorize(UserRole.PATIENT, UserRole.PHARMACIST, UserRole.DELIVERY_DRIVER, UserRole.ADMIN), getDelivery)
// Same for order-based lookup
router.get('/order/:orderId',       authorize(UserRole.PATIENT, UserRole.PHARMACIST, UserRole.DELIVERY_DRIVER, UserRole.ADMIN), getDeliveryByOrder)
// Only DRIVER can update GPS location
router.patch('/:id/location',       authorize(UserRole.DELIVERY_DRIVER),                    updateLocation)
// Only DRIVER can update status
router.patch('/:id/status',         authorize(UserRole.DELIVERY_DRIVER, UserRole.ADMIN),    updateStatus)

export default router