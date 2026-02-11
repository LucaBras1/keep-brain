import { Queue } from "bullmq"
import IORedis from "ioredis"
import { QUEUE_NAMES, MAX_PROCESSING_ATTEMPTS, PROCESSING_BACKOFF_DELAY_MS } from "./constants"

// Lazy-load Redis connection to avoid build-time errors
let connection: IORedis | null = null
let keepSyncQueue: Queue | null = null
let aiProcessingQueue: Queue | null = null

function getConnection(): IORedis {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not set")
    }
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}

function getKeepSyncQueue(): Queue {
  if (!keepSyncQueue) {
    keepSyncQueue = new Queue(QUEUE_NAMES.KEEP_SYNC, {
      connection: getConnection(),
    })
  }
  return keepSyncQueue
}

function getAiProcessingQueue(): Queue {
  if (!aiProcessingQueue) {
    aiProcessingQueue = new Queue(QUEUE_NAMES.AI_PROCESSING, {
      connection: getConnection(),
    })
  }
  return aiProcessingQueue
}

export interface KeepSyncJob {
  userId: string
  action: "authenticate" | "sync" | "exchange-token" | "login-password" | "login-token"
  email?: string
  password?: string
  oauthToken?: string
  appPassword?: string
  masterToken?: string
}

export interface AiProcessingJob {
  noteId: string
  userId: string
  content: string
  title?: string
}

export async function addKeepSyncJob(data: KeepSyncJob): Promise<string> {
  const queue = getKeepSyncQueue()
  const job = await queue.add("sync", data, {
    removeOnComplete: 100,
    removeOnFail: 50,
  })
  return job.id || ""
}

export async function addAiProcessingJob(
  data: AiProcessingJob
): Promise<string> {
  const queue = getAiProcessingQueue()
  const job = await queue.add("process", data, {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: MAX_PROCESSING_ATTEMPTS,
    backoff: {
      type: "exponential",
      delay: PROCESSING_BACKOFF_DELAY_MS,
    },
  })
  return job.id || ""
}

export async function addBatchAiProcessingJobs(
  jobs: AiProcessingJob[]
): Promise<string[]> {
  const queue = getAiProcessingQueue()
  const results = await queue.addBulk(
    jobs.map((data) => ({
      name: "process",
      data,
      opts: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: MAX_PROCESSING_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: PROCESSING_BACKOFF_DELAY_MS,
        },
      },
    }))
  )
  return results.map((job) => job.id || "")
}

export { getKeepSyncQueue, getAiProcessingQueue, getConnection }
