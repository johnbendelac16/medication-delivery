import amqplib from 'amqplib'

let channel: amqplib.Channel

export const connectRabbitMQ = async (): Promise<void> => {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672'
  const connection = await amqplib.connect(url)
  channel = await connection.createChannel()

  // Exchange for delivery events
  await channel.assertExchange('delivery.events', 'topic', { durable: true })

  // Also listen to order events to know when to create a delivery
  await channel.assertExchange('order.events', 'topic', { durable: true })

  console.log('✅ RabbitMQ connected')
}

export const getChannel = (): amqplib.Channel => {
  if (!channel) throw new Error('RabbitMQ not connected')
  return channel
}

export const publishEvent = (routingKey: string, payload: object): void => {
  const ch = getChannel()
  ch.publish(
    'delivery.events',
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  )
  console.log(`📤 Event published: ${routingKey}`)
}