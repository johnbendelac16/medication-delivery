import { Request, Response } from 'express'
import { OrderService } from '../services/order.service'
import { RequestUser } from '../types/order.types'

const orderService = new OrderService()

// Helper — extracts the decoded user injected by the API gateway
const getUser = (req: Request): RequestUser => {
  return JSON.parse(req.headers['x-user'] as string)
}

// POST /orders — patient creates a new order
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getUser(req)
    const order = await orderService.createOrder(user.sub, req.body)
    res.status(201).json(order)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// GET /orders/me — patient gets all their own orders
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getUser(req)
    const orders = await orderService.getOrdersByPatient(user.sub)
    res.status(200).json(orders)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}

// GET /orders/:id — get a single order with full history
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await orderService.getOrderById(req.params['id'] as string)
    res.status(200).json(order)
  } catch (error: any) {
    res.status(404).json({ message: error.message })
  }
}

// PATCH /orders/:id/status — pharmacist or driver updates the order status
export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = getUser(req)
    const order = await orderService.updateStatus(req.params['id'] as string, user.sub, req.body)
    res.status(200).json(order)
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}