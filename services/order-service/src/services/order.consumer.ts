import amqplib from 'amqplib'
import prisma from '../config/prisma'
import { publishEvent } from '../config/rabbitmq'
import { OrderStatus } from '../types/order.types'

const handleEvent = async (routingKey: string, payload: any): Promise<void> => {
  console.log(`\n📩 Event received: ${routingKey}`)

  switch (routingKey) {

    // Pharmacy approved the prescription → update order status
    case 'order.status.prescription_approved': {
      await prisma.order.update({
        where: { id: payload.orderId },
        data: {
          status: OrderStatus.PRESCRIPTION_APPROVED,
          events: {
            create: {
              status: OrderStatus.PRESCRIPTION_APPROVED,
              actorId: payload.pharmacistId,
              note: payload.note || 'Prescription approved by pharmacist'
            }
          }
        }
      })
      console.log(`✅ Order ${payload.orderId} status → PRESCRIPTION_APPROVED`)
      break
    }

    // Pharmacy rejected the prescription → cancel order
    case 'order.status.cancelled': {
      await prisma.order.update({
        where: { id: payload.orderId },
        data: {
          status: OrderStatus.CANCELLED,
          events: {
            create: {
              status: OrderStatus.CANCELLED,
              actorId: payload.pharmacistId,
              note: payload.note || 'Order cancelled'
            }
          }
        }
      })
      console.log(`❌ Order ${payload.orderId} status → CANCELLED`)
      break
    }

    // Pharmacy marked order as ready for pickup → notify delivery-service
    case 'order.status.ready_for_pickup': {
      await prisma.order.update({
        where: { id: payload.orderId },
        data: {
          status: OrderStatus.READY_FOR_PICKUP,
          events: {
            create: {
              status: OrderStatus.READY_FOR_PICKUP,
              actorId: payload.pharmacistId,
              note: 'Order ready for driver pickup'
            }
          }
        }
      })
      console.log(`📦 Order ${payload.orderId} status → READY_FOR_PICKUP`)
      break
    }

    // Delivery driver picked up the order
    case 'delivery.picked_up': {
      await prisma.order.update({
        where: { id: payload.orderId },
        data: {
          status: OrderStatus.IN_DELIVERY,
          events: {
            create: {
              status: OrderStatus.IN_DELIVERY,
              actorId: payload.driverId,
              note: 'Order picked up by driver'
            }
          }
        }
      })
      console.log(`🚚 Order ${payload.orderId} status → IN_DELIVERY`)
      break
    }

    // Delivery completed
    case 'delivery.delivered': {
      const order = await prisma.order.findUnique({ where: { id: payload.orderId } })
      if (!order) break

      await prisma.order.update({
        where: { id: payload.orderId },
        data: {
          status: OrderStatus.DELIVERED,
          events: {
            create: {
              status: OrderStatus.DELIVERED,
              actorId: payload.driverId,
              note: 'Order delivered to patient'
            }
          }
        }
      })

      // Notify all services of final delivery
      publishEvent('order.status.delivered', {
        orderId: payload.orderId,
        patientId: order.patientId
      })

      console.log(`✅ Order ${payload.orderId} status → DELIVERED`)
      break
    }

    default:
      console.log(`⚠️  Unhandled event: ${routingKey}`)
  }
}

export const startOrderConsumer = async (): Promise<void> => {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672'
  const connection = await amqplib.connect(url)
  const channel = await connection.createChannel()

  // Listen to order events (from pharmacy) and delivery events (from driver)
  await channel.assertExchange('order.events',    'topic', { durable: true })
  await channel.assertExchange('delivery.events', 'topic', { durable: true })

  const q = await channel.assertQueue('order.consumer.queue', { durable: true })

  // Subscribe to status update events
  await channel.bindQueue(q.queue, 'order.events',    'order.status.prescription_approved')
  await channel.bindQueue(q.queue, 'order.events',    'order.status.cancelled')
  await channel.bindQueue(q.queue, 'order.events',    'order.status.ready_for_pickup')
  await channel.bindQueue(q.queue, 'delivery.events', 'delivery.picked_up')
  await channel.bindQueue(q.queue, 'delivery.events', 'delivery.delivered')

  channel.prefetch(1)

  channel.consume(q.queue, async (msg) => {
    if (!msg) return
    const payload = JSON.parse(msg.content.toString())
    await handleEvent(msg.fields.routingKey, payload)
    channel.ack(msg)
  })

  console.log('✅ order-service consumer listening for status updates')
}