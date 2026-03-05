import amqplib from 'amqplib'

// Handles what to do when an event is received
const handleEvent = (routingKey: string, payload: any): void => {
  console.log(`\n📩 Event received: ${routingKey}`)
  console.log('   Payload:', JSON.stringify(payload, null, 2))

  switch (routingKey) {

    // ─── Order Events ───────────────────────────────────────────────────────

    case 'order.created':
      console.log(`🔔 [SMS] Patient ${payload.patientId}: Your order has been placed and is awaiting prescription validation`)
      // TODO: integrate AWS SNS → send SMS to patient
      break

    case 'order.status.prescription_approved':
      console.log(`🔔 [PUSH] Patient ${payload.patientId}: Your prescription has been approved, order is being prepared`)
      // TODO: integrate Firebase FCM → push notification to patient app
      break

    case 'order.status.ready_for_pickup':
      console.log(`🔔 [PUSH] Patient ${payload.patientId}: Your order is ready, a driver has been assigned`)
      break

    case 'order.status.in_delivery':
      console.log(`🔔 [PUSH] Patient ${payload.patientId}: Your order is on its way!`)
      break

    case 'order.status.delivered':
      console.log(`🔔 [PUSH] Patient ${payload.patientId}: Your order has been delivered. Thank you!`)
      // TODO: trigger rating request after 1 hour
      break

    case 'order.status.cancelled':
      console.log(`🔔 [SMS] Patient ${payload.patientId}: Your order has been cancelled`)
      break

    // ─── Delivery Events ────────────────────────────────────────────────────

    case 'delivery.assigned':
      console.log(`🔔 [PUSH] Driver ${payload.driverId}: You have a new delivery assignment`)
      break

    case 'delivery.location.updated':
      console.log(`📍 [REALTIME] Order ${payload.orderId}: Driver at ${payload.latitude}, ${payload.longitude}`)
      // TODO: broadcast via WebSocket to patient's app for live tracking
      break

    case 'delivery.in_transit':
    console.log(`🔔 [PUSH] Patient: Your order is on its way!`)
    break
    
    case 'delivery.delivered':
      console.log(`✅ [PUSH] Order ${payload.orderId} successfully delivered`)
      break

    case 'delivery.failed':
      console.log(`❌ [SMS] Order ${payload.orderId} delivery failed — rescheduling`)
      break

    // ─── User Events ────────────────────────────────────────────────────────

    case 'user.registered':
      console.log(`👋 [EMAIL] Welcome email to new user ${payload.email}`)
      // TODO: integrate AWS SES → send welcome email
      break

    default:
      console.log(`⚠️  Unhandled event: ${routingKey}`)
  }
}

export const startConsumer = async (): Promise<void> => {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672'
  const connection = await amqplib.connect(url)
  const channel = await connection.createChannel()

  // Declare all exchanges this service needs to listen to
  await channel.assertExchange('order.events',    'topic', { durable: true })
  await channel.assertExchange('delivery.events', 'topic', { durable: true })
  await channel.assertExchange('user.events',     'topic', { durable: true })

  // Create a dedicated queue for this service
  const q = await channel.assertQueue('notification.queue', { durable: true })

  // Subscribe to all events from all exchanges
  await channel.bindQueue(q.queue, 'order.events',    'order.#')
  await channel.bindQueue(q.queue, 'delivery.events', 'delivery.#')
  await channel.bindQueue(q.queue, 'user.events',     'user.#')

  // Process one message at a time — don't overwhelm external APIs
  channel.prefetch(1)

  channel.consume(q.queue, (msg) => {
    if (!msg) return
    const payload = JSON.parse(msg.content.toString())
    handleEvent(msg.fields.routingKey, payload)
    channel.ack(msg) // acknowledge message so RabbitMQ removes it from the queue
  })

  console.log('✅ notification-service listening on: order.# | delivery.# | user.#')
}