import Anthropic from "@anthropic-ai/sdk";

import { decide, isValidUserId, type AccessEnv } from "./access";
import { appraise } from "./appraise";
import { AnalyzeRequest } from "./schema";

export interface Env extends AccessEnv {
  ANTHROPIC_API_KEY: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function handle(request: Request, env: Env, client?: Anthropic): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") return json(200, { ok: true });
  if (request.method !== "POST" || url.pathname !== "/v1/analyze") return json(404, { error: "not_found" });

  const userId = request.headers.get("x-app-user-id");
  if (!isValidUserId(userId)) return json(401, { error: "missing_user" });

  let input: AnalyzeRequest;
  try {
    const parsed = AnalyzeRequest.safeParse(await request.json());
    if (!parsed.success) return json(400, { error: "bad_request" });
    input = parsed.data;
  } catch {
    return json(400, { error: "bad_request" });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  let decision;
  try {
    decision = await decide(env, userId, ip);
  } catch (err) {
    console.error("access check failed", err);
    return json(503, { error: "try_again" });
  }
  if (!decision.allowed) return json(402, { error: decision.reason });

  const anthropic = client ?? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
  try {
    const result = await appraise(anthropic, input);
    if ("refused" in result) return json(422, { error: "could_not_analyze" });
    // Only count scans that actually returned something useful.
    if (result.identified) await decision.commit();
    return json(200, { appraisal: result, pro: decision.pro });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      return json(503, { error: "try_again" });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("anthropic error", err.status, err.message);
      return json(502, { error: "upstream" });
    }
    console.error("unexpected", err);
    return json(500, { error: "internal" });
  }
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
} satisfies ExportedHandler<Env>;
