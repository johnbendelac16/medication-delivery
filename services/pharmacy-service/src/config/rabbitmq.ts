import amqplib from 'amqplib'

let channel: amqplib.Channel

export const connectRabbitMQ = async (): Promise<void> => {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672'
  const connection = await amqplib.connect(url)
  channel = await connection.createChannel()

  // Exchange for publishing prescription validation results
  await channel.assertExchange('order.events', 'topic', { durable: true })

  console.log('✅ RabbitMQ connected')
}

export const getChannel = (): amqplib.Channel => {
  if (!channel) throw new Error('RabbitMQ not connected')
  return channel
}

// Publishes to order.events exchange — pharmacy validates or rejects prescriptions
export const publishEvent = (routingKey: string, payload: object): void => {
  const ch = getChannel()
  ch.publish(
    'order.events',
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  )
  console.log(`📤 Event published: ${routingKey}`)
}