import prisma from '../config/prisma'
import { publishEvent } from '../config/rabbitmq'
import { CreateOrderDto, OrderStatus, UpdateOrderStatusDto } from '../types/order.types'

export class OrderService {

  // ─── Create Order ─────────────────────────────────────────────────────────
  // Called when a patient places a new order
  // Saves to DB and notifies pharmacy-service via RabbitMQ

  async createOrder(patientId: string, dto: CreateOrderDto) {
    const order = await prisma.order.create({
      data: {
        patientId,
        pharmacyId: dto.pharmacyId,
        prescriptionUrl: dto.prescriptionUrl,
        notes: dto.notes,
        items: {
          create: dto.items
        },
        events: {
          create: {
            status: OrderStatus.PENDING_PRESCRIPTION,
            actorId: patientId,
            note: 'Order created, awaiting prescription validation'
          }
        }
      },
      include: { items: true, events: true }
    })

    // Notify pharmacy-service that a new order needs prescription review
    publishEvent('order.created', {
      orderId: order.id,
      pharmacyId: order.pharmacyId,
      patientId: order.patientId,
      prescriptionUrl: order.prescriptionUrl
    })

    return order
  }

  // ─── Get Order by ID ──────────────────────────────────────────────────────
  // Returns the order with all its items and full status history

  async getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } } // chronological history
      }
    })
    if (!order) throw new Error('Order not found')
    return order
  }

  // ─── Get Orders by Patient ────────────────────────────────────────────────
  // Returns all orders for a given patient, most recent first

  async getOrdersByPatient(patientId: string) {
    return prisma.order.findMany({
      where: { patientId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  // ─── Update Order Status ──────────────────────────────────────────────────
  // Called by pharmacist or delivery driver to move the order forward
  // Every change is recorded in OrderEvent for full traceability

  async updateStatus(orderId: string, actorId: string, dto: UpdateOrderStatusDto) {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) throw new Error('Order not found')

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        events: {
          create: {
            status: dto.status,
            actorId,
            note: dto.note
          }
        }
      },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } }
      }
    })

    // Notify all other services of the status change
    publishEvent(`order.status.${dto.status.toLowerCase()}`, {
      orderId: updated.id,
      patientId: updated.patientId,
      pharmacyId: updated.pharmacyId,
      status: updated.status
    })

    return updated
  }
}