import Anthropic from "@anthropic-ai/sdk";
import { ASSESSMENT_SCHEMA, ASSESSMENT_SYSTEM_PROMPT, buildUserPrompt } from "./prompts";

const MODEL = "claude-sonnet-5";

/**
 * Calls Claude directly from the browser (dangerouslyAllowBrowser) with the
 * user's own key — never sent anywhere but api.anthropic.com. Structured
 * outputs (output_config.format) guarantee valid JSON back, so there's no
 * markdown-fence stripping or retry-on-parse-failure logic needed.
 */
export async function generateAssessment({ apiKey, fileName, summary }) {
  if (!apiKey) {
    throw new Error("No API key set. Add one in Settings first.");
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: ASSESSMENT_SCHEMA },
      },
      system: ASSESSMENT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt({ fileName, summary }) }],
    });
  } catch (err) {
    throw new Error(describeApiError(err));
  }

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to generate this assessment. Try again, or check the data for anything sensitive.");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) {
    throw new Error("The model returned no text content.");
  }

  try {
    return JSON.parse(textBlock.text);
  } catch {
    throw new Error("The model's response wasn't valid JSON. Please try again.");
  }
}

function describeApiError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return "That API key was rejected. Check it in Settings and try again.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "This API key doesn't have permission to call this model.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limited by the API. Wait a moment and try again.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Couldn't reach the Anthropic API. Check your connection and try again.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error (${err.status}): ${err.message}`;
  }
  return err.message ?? "Something went wrong calling the API.";
}
