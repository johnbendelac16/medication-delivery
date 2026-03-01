import prisma from '../config/prisma'
import { publishEvent } from '../config/rabbitmq'
import { CreateDeliveryDto, DeliveryStatus, UpdateLocationDto, UpdateStatusDto } from '../types/delivery.types'

export class DeliveryService {

  // ─── Create Delivery ──────────────────────────────────────────────────────
  // Called when pharmacy marks order as READY_FOR_PICKUP
  // Assigns a driver to the order

  async createDelivery(dto: CreateDeliveryDto) {
    const delivery = await prisma.delivery.create({
      data: {
        orderId: dto.orderId,
        driverId: dto.driverId,
        status: DeliveryStatus.ASSIGNED,
        events: {
          create: {
            status: DeliveryStatus.ASSIGNED,
            note: 'Driver assigned to order'
          }
        }
      },
      include: { events: true }
    })

    publishEvent('delivery.assigned', {
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      driverId: delivery.driverId
    })

    return delivery
  }

  // ─── Get Delivery by ID ───────────────────────────────────────────────────

  async getDeliveryById(deliveryId: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { events: { orderBy: { createdAt: 'asc' } } }
    })
    if (!delivery) throw new Error('Delivery not found')
    return delivery
  }

  // ─── Get Delivery by Order ID ─────────────────────────────────────────────

  async getDeliveryByOrderId(orderId: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { orderId },
      include: { events: { orderBy: { createdAt: 'asc' } } }
    })
    if (!delivery) throw new Error('Delivery not found for this order')
    return delivery
  }

  // ─── Update Location ──────────────────────────────────────────────────────
  // Called every 30 seconds by the driver's mobile app to update GPS position

  async updateLocation(deliveryId: string, dto: UpdateLocationDto) {
    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        latitude: dto.latitude,
        longitude: dto.longitude,
        events: {
          create: {
            status: DeliveryStatus.IN_TRANSIT,
            latitude: dto.latitude,
            longitude: dto.longitude,
            note: 'Location updated'
          }
        }
      }
    })

    // Notify notification-service so patient can see driver position in real time
    publishEvent('delivery.location.updated', {
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      latitude: dto.latitude,
      longitude: dto.longitude
    })

    return delivery
  }

  // ─── Update Status ────────────────────────────────────────────────────────
  // Driver updates status: PICKED_UP → IN_TRANSIT → DELIVERED or FAILED

  async updateStatus(deliveryId: string, dto: UpdateStatusDto) {
    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: dto.status,
        latitude: dto.latitude,
        longitude: dto.longitude,
        events: {
          create: {
            status: dto.status,
            latitude: dto.latitude,
            longitude: dto.longitude,
            note: dto.note
          }
        }
      },
      include: { events: { orderBy: { createdAt: 'asc' } } }
    })

    // Notify order-service and notification-service of the status change
    publishEvent(`delivery.${dto.status.toLowerCase()}`, {
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      driverId: delivery.driverId,
      status: delivery.status
    })

    return delivery
  }
}