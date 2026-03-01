import prisma from '../config/prisma'
import { publishEvent } from '../config/rabbitmq'
import { CreateMedicationDto, CreatePharmacyDto, UpdateStockDto, ValidatePrescriptionDto } from '../types/pharmacy.types'

export class PharmacyService {

  // ─── Pharmacies ───────────────────────────────────────────────────────────

  async createPharmacy(dto: CreatePharmacyDto) {
    return prisma.pharmacy.create({ data: dto })
  }

  async getAllPharmacies() {
    return prisma.pharmacy.findMany({
      where: { isActive: true },
      include: { medications: true }
    })
  }

  async getPharmacyById(pharmacyId: string) {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: { medications: true }
    })
    if (!pharmacy) throw new Error('Pharmacy not found')
    return pharmacy
  }

  // ─── Medications ──────────────────────────────────────────────────────────

  async createMedication(pharmacyId: string, dto: CreateMedicationDto) {
    // Verify pharmacy exists
    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } })
    if (!pharmacy) throw new Error('Pharmacy not found')

    return prisma.medication.create({
      data: { ...dto, pharmacyId }
    })
  }

  async getMedicationsByPharmacy(pharmacyId: string) {
    return prisma.medication.findMany({
      where: { pharmacyId },
      orderBy: { name: 'asc' }
    })
  }

  async updateStock(medicationId: string, dto: UpdateStockDto) {
    const medication = await prisma.medication.findUnique({ where: { id: medicationId } })
    if (!medication) throw new Error('Medication not found')

    return prisma.medication.update({
      where: { id: medicationId },
      data: { stock: dto.stock }
    })
  }

  // ─── Prescription Validation ──────────────────────────────────────────────
  // Called by a pharmacist to approve or reject a prescription
  // Publishes an event so order-service and notification-service can react

  async validatePrescription(pharmacistId: string, dto: ValidatePrescriptionDto) {
    if (dto.approved) {
      // Prescription approved — notify order-service to update status
      publishEvent('order.status.prescription_approved', {
        orderId: dto.orderId,
        pharmacistId,
        note: dto.note || 'Prescription validated by pharmacist'
      })

      console.log(`✅ Prescription approved for order ${dto.orderId}`)
    } else {
      // Prescription rejected — cancel the order
      publishEvent('order.status.cancelled', {
        orderId: dto.orderId,
        pharmacistId,
        note: dto.note || 'Prescription rejected by pharmacist'
      })

      console.log(`❌ Prescription rejected for order ${dto.orderId}`)
    }

    return {
      orderId: dto.orderId,
      approved: dto.approved,
      note: dto.note
    }
  }
}