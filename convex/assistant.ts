"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { internalAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Newer Claude models (the Claude 5 family) manage sampling internally and
// reject an explicit `temperature`. We only send one for models that still
// accept it. Claude's temperature is 0–1; a value like 7.0 is read as 0.7.
function buildTemperature(): number | undefined {
  if (/(opus|sonnet|fable)-5/i.test(MODEL)) return undefined;
  const raw = Number(process.env.ANTHROPIC_TEMPERATURE ?? "0.7");
  if (!Number.isFinite(raw)) return 0.7;
  if (raw > 1 && raw <= 10) return Math.min(1, raw / 10);
  return Math.min(1, Math.max(0, raw));
}

const SYSTEM = `You are Northwind Support's AI assistant helping a customer with their support ticket.
You can look up and update ONLY this customer's orders using the provided tools.
Be concise, professional, and helpful. Confirm changes you make.
If you cannot help with something (refunds beyond status changes, account security), say a human agent will follow up.
Never invent order references that tools did not return.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_orders",
    description: "List all orders for the customer on this ticket.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_order",
    description: "Get one order by its reference code (e.g. ORD-1001).",
    input_schema: {
      type: "object",
      properties: {
        reference: { type: "string", description: "Order reference code" },
      },
      required: ["reference"],
      additionalProperties: false,
    },
  },
  {
    name: "set_order_status",
    description:
      "Update an order's status for this customer only. Allowed: processing, shipped, delivered, cancelled.",
    input_schema: {
      type: "object",
      properties: {
        reference: { type: "string" },
        status: {
          type: "string",
          enum: ["processing", "shipped", "delivered", "cancelled"],
        },
      },
      required: ["reference", "status"],
      additionalProperties: false,
    },
  },
];

type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";

export const generateReply = internalAction({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.tickets.postAssistantMessage, {
        ticketId,
        body: "I'm not configured yet — an administrator needs to set ANTHROPIC_API_KEY on the Convex deployment.",
      });
      await ctx.runMutation(internal.audit.append, {
        ticketId,
        actorType: "system",
        action: "assistant_misconfigured",
        summary: "Assistant skipped: ANTHROPIC_API_KEY is not set",
      });
      return null;
    }

    const context = await ctx.runQuery(internal.tickets.getTicketContext, {
      ticketId,
    });
    if (context === null) return null;

    const customerId = context.ticket.customerId;

    await ctx.runMutation(internal.audit.append, {
      ticketId,
      actorType: "assistant",
      action: "assistant_started",
      summary: "Assistant began generating a reply",
    });

    const anthropic = new Anthropic({ apiKey });

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: [
          `Ticket subject: ${context.ticket.subject}`,
          `Customer: ${context.customerName ?? "unknown"} <${context.customerEmail ?? "unknown"}>`,
          "",
          "Conversation so far:",
          ...context.messages.map((m) => `[${m.authorRole}]: ${m.body}`),
          "",
          "Reply to the customer's latest message. Use tools if you need order data.",
        ].join("\n"),
      },
    ];

    let finalText = "";
    const maxRounds = 6;

    for (let round = 0; round < maxRounds; round++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        temperature: buildTemperature(),
        system: SYSTEM,
        tools: TOOLS,
        messages,
      });

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      const textParts = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text);

      if (toolUses.length === 0) {
        finalText = textParts.join("\n").trim();
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tool of toolUses) {
        const result = await runTool(ctx, customerId, ticketId, tool);
        toolResults.push({
          type: "tool_result",
          tool_use_id: tool.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });

      if (response.stop_reason === "end_turn" && textParts.length > 0) {
        finalText = textParts.join("\n").trim();
      }
    }

    if (!finalText) {
      finalText =
        "I've looked into that for you. Please let me know if you need anything else, or a human agent can take over.";
    }

    await ctx.runMutation(internal.tickets.postAssistantMessage, {
      ticketId,
      body: finalText,
    });

    return null;
  },
});

async function runTool(
  ctx: ActionCtx,
  customerId: Id<"users">,
  ticketId: Id<"tickets">,
  tool: Anthropic.ToolUseBlock,
): Promise<unknown> {
  const input = tool.input as Record<string, unknown>;

  if (tool.name === "list_orders") {
    const orders = await ctx.runQuery(internal.orders.listOrdersForCustomer, {
      customerId,
    });
    await ctx.runMutation(internal.audit.append, {
      ticketId,
      actorType: "assistant",
      action: "tool_list_orders",
      summary: "Assistant listed customer orders",
      data: { count: orders.length },
    });
    return orders;
  }

  if (tool.name === "get_order") {
    const reference = String(input.reference ?? "");
    const order = await ctx.runQuery(internal.orders.getOrderForCustomer, {
      customerId,
      reference,
    });
    await ctx.runMutation(internal.audit.append, {
      ticketId,
      actorType: "assistant",
      action: "tool_get_order",
      summary: `Assistant looked up order ${reference}`,
      data: { reference, found: order !== null },
    });
    return order ?? { error: "Order not found for this customer" };
  }

  if (tool.name === "set_order_status") {
    const reference = String(input.reference ?? "");
    const status = input.status as OrderStatus;
    const result = await ctx.runMutation(
      internal.orders.setOrderStatusForCustomer,
      { customerId, reference, status },
    );
    await ctx.runMutation(internal.audit.append, {
      ticketId,
      actorType: "assistant",
      action: "tool_set_order_status",
      summary: `Assistant set order ${reference} → ${status}`,
      data: { reference, status, result },
    });
    return result;
  }

  return { error: `Unknown tool: ${tool.name}` };
}
