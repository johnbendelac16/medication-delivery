import { Router } from 'express'
import {
  createPharmacy,
  getAllPharmacies,
  getPharmacy,
  createMedication,
  getMedications,
  updateStock,
  validatePrescription
} from '../controllers/pharmacy.controller'
import { authorize, UserRole } from '../middlewares/authorize.middleware'

const router = Router()

// Only ADMIN can create a pharmacy
router.post('/',                                    authorize(UserRole.ADMIN),               createPharmacy)
// Anyone authenticated can list pharmacies
router.get('/',                                     authorize(UserRole.PATIENT, UserRole.PHARMACIST, UserRole.DELIVERY_DRIVER, UserRole.ADMIN), getAllPharmacies)
// Anyone authenticated can see a pharmacy
router.get('/:id',                                  authorize(UserRole.PATIENT, UserRole.PHARMACIST, UserRole.DELIVERY_DRIVER, UserRole.ADMIN), getPharmacy)
// Only PHARMACIST or ADMIN can add medications
router.post('/:id/medications',                     authorize(UserRole.PHARMACIST, UserRole.ADMIN), createMedication)
// Anyone authenticated can see medications
router.get('/:id/medications',                      authorize(UserRole.PATIENT, UserRole.PHARMACIST, UserRole.DELIVERY_DRIVER, UserRole.ADMIN), getMedications)
// Only PHARMACIST can update stock
router.patch('/medications/:medicationId/stock',    authorize(UserRole.PHARMACIST, UserRole.ADMIN), updateStock)
// Only PHARMACIST can validate prescriptions
router.post('/prescriptions/validate',              authorize(UserRole.PHARMACIST, UserRole.ADMIN), validatePrescription)

export default router