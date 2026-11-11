import pino from "pino";

const logger = pino({ name: "nexus-worker" });

async function startWorker() {
  logger.info("Nexus Worker initialized. Waiting for background queues...");

  // Graceful shutdown
  const shutdown = () => {
    logger.info("Shutting down Nexus Worker cleanly...");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startWorker();
