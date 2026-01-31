import { Queue } from "bullmq"
import IORedis from "ioredis"

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
    keepSyncQueue = new Queue("keep-sync", {
      connection: getConnection(),
    })
  }
  return keepSyncQueue
}

function getAiProcessingQueue(): Queue {
  if (!aiProcessingQueue) {
    aiProcessingQueue = new Queue("ai-processing", {
      connection: getConnection(),
    })
  }
  return aiProcessingQueue
}

export interface KeepSyncJob {
  userId: string
  action: "authenticate" | "sync" | "exchange-token"
  email?: string
  password?: string
  oauthToken?: string
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
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
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
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    }))
  )
  return results.map((job) => job.id || "")
}

export { getKeepSyncQueue, getAiProcessingQueue, getConnection }
