import { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { HttpError } from "../errors/http-error";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        message: error.message,
        code: error.code,
        details: error.details
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.flatten()
      });
    }

    return reply.status(500).send({
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  });
}