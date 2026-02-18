import { FastifyReply, FastifyRequest } from "fastify";
import { JwtPayload, verifyAccessToken } from "../plugins/jwt";
import { promises } from "dns";


declare module "fastify" {
    export interface FastifyRequest {
         user?: JwtPayload;
    }
}

export async function authenticateRequest( request: FastifyRequest,
  reply: FastifyReply):Promise<void> {
    try {
            const authHeader = request.headers.authorization;
if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ message: "No token provided" });
    }

  const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    request.user = payload;
    } catch (error) {
          return reply.status(401).send({ message: "Invalid or expired token" });
  
    }
}