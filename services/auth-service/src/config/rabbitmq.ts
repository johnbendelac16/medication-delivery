import amqplib from 'amqplib'

let channel: amqplib.Channel

export const connectRabbitMQ = async (): Promise<void> => {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672'
  const connection = await amqplib.connect(url)
  channel = await connection.createChannel()

  // Declare the exchange used by all user-related events
  // An exchange is like a post office — it receives messages and routes them
  await channel.assertExchange('user.events', 'topic', { durable: true })

  console.log('✅ RabbitMQ connected')
}

export const getChannel = (): amqplib.Channel => {
  if (!channel) throw new Error('RabbitMQ not connected')
  return channel
}

// Publish an event so other services can react to it
export const publishEvent = (routingKey: string, payload: object): void => {
  const ch = getChannel()
  ch.publish(
    'user.events',
    routingKey,
    Buffer.from(JSON.stringify(payload)),
    { persistent: true } // message survives broker restart
  )
  console.log(`📤 Event published: ${routingKey}`)
}
