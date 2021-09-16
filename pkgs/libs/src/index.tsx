export { matchRoute } from './match-route'
export { waitUntil } from './wait-until'

import type { db as dbImpl, dbAll as dbAllImpl } from 'db'
import { prepareAllDBClient, prepareDBClient } from './db-client'
export const db: typeof dbImpl = prepareDBClient('main')
export const dbAll: typeof dbAllImpl = prepareAllDBClient()
