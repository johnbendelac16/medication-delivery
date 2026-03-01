import { Request, Response } from 'express'
import { DeliveryService } from '../services/delivery.service'
import { RequestUser } from '../types/delivery.types'

const deliveryService = new DeliveryService()

const getUser = (req: Request): RequestUser => {
  return JSON.parse(req.headers['x-user'] as string)
}

// POST /deliveries — create a delivery (called by pharmacist)
export const createDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const delivery = await deliveryService.createDelivery(req.body)
    res.status(201).json(delivery)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// GET /deliveries/:id — get delivery by ID
export const getDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const delivery = await deliveryService.getDeliveryById(req.params['id'] as string)
    res.status(200).json(delivery)
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}

// GET /deliveries/order/:orderId — get delivery by order ID
export const getDeliveryByOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const delivery = await deliveryService.getDeliveryByOrderId(req.params['orderId'] as string)
    res.status(200).json(delivery)
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}

// PATCH /deliveries/:id/location — driver updates GPS position
export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const delivery = await deliveryService.updateLocation(req.params['id'] as string, req.body)
    res.status(200).json(delivery)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// PATCH /deliveries/:id/status — driver updates delivery status
export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const delivery = await deliveryService.updateStatus(req.params['id'] as string, req.body)
    res.status(200).json(delivery)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}