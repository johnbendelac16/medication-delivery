import { Request, Response } from 'express'
import { PharmacyService } from '../services/pharmacy.service'
import { RequestUser } from '../types/pharmacy.types'

const pharmacyService = new PharmacyService()

const getUser = (req: Request): RequestUser => {
  return JSON.parse(req.headers['x-user'] as string)
}

// POST /pharmacies — create a pharmacy (ADMIN only)
export const createPharmacy = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacy = await pharmacyService.createPharmacy(req.body)
    res.status(201).json(pharmacy)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// GET /pharmacies — list all active pharmacies
export const getAllPharmacies = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacies = await pharmacyService.getAllPharmacies()
    res.status(200).json(pharmacies)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// GET /pharmacies/:id — get a single pharmacy
export const getPharmacy = async (req: Request, res: Response): Promise<void> => {
  try {
    const pharmacy = await pharmacyService.getPharmacyById(req.params['id'] as string)
    res.status(200).json(pharmacy)
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}

// POST /pharmacies/:id/medications — add a medication to a pharmacy
export const createMedication = async (req: Request, res: Response): Promise<void> => {
  try {
    const medication = await pharmacyService.createMedication(req.params['id'] as string, req.body)
    res.status(201).json(medication)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// GET /pharmacies/:id/medications — list medications of a pharmacy
export const getMedications = async (req: Request, res: Response): Promise<void> => {
  try {
    const medications = await pharmacyService.getMedicationsByPharmacy(req.params['id'] as string)
    res.status(200).json(medications)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// PATCH /pharmacies/medications/:medicationId/stock — update stock
export const updateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const medication = await pharmacyService.updateStock(req.params['medicationId'] as string, req.body)
    res.status(200).json(medication)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// POST /pharmacies/prescriptions/validate — pharmacist validates a prescription
export const validatePrescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getUser(req)
    const result = await pharmacyService.validatePrescription(user.sub, req.body)
    res.status(200).json(result)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}