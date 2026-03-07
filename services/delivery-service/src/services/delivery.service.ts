import prisma from '../config/prisma'
import { publishEvent } from '../config/rabbitmq'
import { publishGPS } from '../config/redis'
import { CreateDeliveryDto, DeliveryStatus, UpdateLocationDto, UpdateStatusDto } from '../types/delivery.types'

export class DeliveryService {

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

  async getDeliveryById(deliveryId: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { events: { orderBy: { createdAt: 'asc' } } }
    })
    if (!delivery) throw new Error('Delivery not found')
    return delivery
  }

  async getDeliveryByOrderId(orderId: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { orderId },
      include: { events: { orderBy: { createdAt: 'asc' } } }
    })
    if (!delivery) throw new Error('Delivery not found for this order')
    return delivery
  }

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

    // Publish to Redis Pub/Sub → WebSocket → patient sees position in real time
    await publishGPS(
      delivery.orderId,
      delivery.driverId,
      dto.latitude,
      dto.longitude
    )

    publishEvent('delivery.location.updated', {
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      latitude: dto.latitude,
      longitude: dto.longitude
    })

    return delivery
  }

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

    publishEvent(`delivery.${dto.status.toLowerCase()}`, {
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      driverId: delivery.driverId,
      status: delivery.status
    })

    return delivery
  }
}