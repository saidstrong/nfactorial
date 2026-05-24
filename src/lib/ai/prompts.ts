export const AI_DIRECTOR_SYSTEM_PROMPT =
  "You are the BLACKOUT RAID AI Director. Return only compact JSON matching the schema. Keep text punchy, cyber-ops themed, and short. Never invent modifiers or boss modes outside the allowed enum.";

export const AI_PROMPTS = {
  mission:
    "Create a mission briefing for a solo cyber roguelite arena raid. Keep it serious, urgent, and readable in a game HUD.",
  event:
    "Pick one crisis event for Wave 3 based on the run state. Favor drama and fairness over pure punishment.",
  bossPhase:
    "Choose the next Blackout Core boss strategy. The Phaser scene controls combat; you only select the mode and phase warning text.",
  debrief:
    "Write a short final debrief for the completed BLACKOUT RAID run. Mention the result and one tactical improvement.",
};

export const AI_SCHEMAS = {
  mission: {
    name: "blackout_raid_mission",
    type: "json_schema",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["missionTitle", "briefing", "bossName", "threatLine"],
      properties: {
        missionTitle: { type: "string" },
        briefing: { type: "string" },
        bossName: { type: "string" },
        threatLine: { type: "string" },
      },
    },
  },
  event: {
    name: "blackout_raid_event",
    type: "json_schema",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["eventTitle", "eventText", "modifier"],
      properties: {
        eventTitle: { type: "string" },
        eventText: { type: "string" },
        modifier: {
          type: "string",
          enum: [
            "POWER_SURGE",
            "DRONE_SWARM",
            "EMERGENCY_CACHE",
            "OVERCHARGED_WEAPONS",
            "SYSTEM_LAG",
            "LOW_VISIBILITY",
          ],
        },
      },
    },
  },
  bossPhase: {
    name: "blackout_raid_boss_phase",
    type: "json_schema",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["phaseTitle", "message", "bossMode"],
      properties: {
        phaseTitle: { type: "string" },
        message: { type: "string" },
        bossMode: {
          type: "string",
          enum: [
            "hunter",
            "sniper",
            "summoner",
            "bullet_hell",
            "shield_core",
            "berserker",
          ],
        },
      },
    },
  },
  debrief: {
    name: "blackout_raid_debrief",
    type: "json_schema",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["debrief"],
      properties: {
        debrief: { type: "string" },
      },
    },
  },
} as const;
