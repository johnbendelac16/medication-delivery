import prisma from '../config/prisma'
import { publishEvent } from '../config/rabbitmq'
import { getCache, setCache, deleteCache } from '../config/redis'
import { CreateMedicationDto, CreatePharmacyDto, UpdateStockDto, ValidatePrescriptionDto } from '../types/pharmacy.types'

const CACHE_TTL = {
  PHARMACIES_LIST: 300,
  PHARMACY:        300,
  MEDICATIONS:     120,
}

export class PharmacyService {

  async createPharmacy(dto: CreatePharmacyDto) {
    const pharmacy = await prisma.pharmacy.create({ data: dto })
    await deleteCache('pharmacies:all')
    return pharmacy
  }

  async getAllPharmacies() {
    const cacheKey = 'pharmacies:all'
    const cached = await getCache(cacheKey)
    if (cached) {
      console.log('🟢 Cache HIT: pharmacies:all')
      return cached
    }
    console.log('🔴 Cache MISS: pharmacies:all — querying DB')
    const pharmacies = await prisma.pharmacy.findMany({
      where: { isActive: true },
      include: { medications: true }
    })
    await setCache(cacheKey, pharmacies, CACHE_TTL.PHARMACIES_LIST)
    return pharmacies
  }

  async getPharmacyById(pharmacyId: string) {
    const cacheKey = `pharmacies:${pharmacyId}`
    const cached = await getCache(cacheKey)
    if (cached) {
      console.log(`🟢 Cache HIT: ${cacheKey}`)
      return cached
    }
    console.log(`🔴 Cache MISS: ${cacheKey} — querying DB`)
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: { medications: true }
    })
    if (!pharmacy) throw new Error('Pharmacy not found')
    await setCache(cacheKey, pharmacy, CACHE_TTL.PHARMACY)
    return pharmacy
  }

  async createMedication(pharmacyId: string, dto: CreateMedicationDto) {
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } })
    if (!pharmacy) throw new Error('Pharmacy not found')
    const medication = await prisma.medication.create({ data: { ...dto, pharmacyId } })
    await deleteCache(`pharmacies:${pharmacyId}`)
    await deleteCache('pharmacies:all')
    await deleteCache(`medications:${pharmacyId}`)
    return medication
  }

  async getMedicationsByPharmacy(pharmacyId: string) {
    const cacheKey = `medications:${pharmacyId}`
    const cached = await getCache(cacheKey)
    if (cached) {
      console.log(`🟢 Cache HIT: ${cacheKey}`)
      return cached
    }
    console.log(`🔴 Cache MISS: ${cacheKey} — querying DB`)
    const medications = await prisma.medication.findMany({
      where: { pharmacyId },
      orderBy: { name: 'asc' }
    })
    await setCache(cacheKey, medications, CACHE_TTL.MEDICATIONS)
    return medications
  }

  async updateStock(medicationId: string, dto: UpdateStockDto) {
    const medication = await prisma.medication.findUnique({ where: { id: medicationId } })
    if (!medication) throw new Error('Medication not found')
    const updated = await prisma.medication.update({
      where: { id: medicationId },
      data: { stock: dto.stock }
    })
    await deleteCache(`medications:${medication.pharmacyId}`)
    await deleteCache(`pharmacies:${medication.pharmacyId}`)
    await deleteCache('pharmacies:all')
    return updated
  }

  async validatePrescription(pharmacistId: string, dto: ValidatePrescriptionDto) {
    if (dto.approved) {
      publishEvent('order.status.prescription_approved', {
        orderId: dto.orderId,
        pharmacistId,
        note: dto.note || 'Prescription validated by pharmacist'
      })
      console.log(`✅ Prescription approved for order ${dto.orderId}`)
    } else {
      publishEvent('order.status.cancelled', {
        orderId: dto.orderId,
        pharmacistId,
        note: dto.note || 'Prescription rejected by pharmacist'
      })
      console.log(`❌ Prescription rejected for order ${dto.orderId}`)
    }
    return { orderId: dto.orderId, approved: dto.approved, note: dto.note }
  }
}