import { AuditLogEvent, User } from "discord.js";
import { CaseTypes } from "../../../data/CaseTypes";
import { Case } from "../../../data/entities/Case";
import { logger } from "../../../logger";
import { UnknownUser, resolveUser } from "../../../utils";
import { findMatchingAuditLogEntry } from "../../../utils/findMatchingAuditLogEntry";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { clearIgnoredEvents } from "../functions/clearIgnoredEvents";
import { isEventIgnored } from "../functions/isEventIgnored";
import { IgnoredEventType, modActionsEvt } from "../types";

/**
 * Create a KICK case automatically when a user is kicked manually.
 * Attempts to find the kick's details in the audit log.
 */
export const CreateKickCaseOnManualKickEvt = modActionsEvt({
  event: "guildMemberRemove",
  async listener({ pluginData, args: { member } }) {
    if (isEventIgnored(pluginData, IgnoredEventType.Kick, member.id)) {
      clearIgnoredEvents(pluginData, IgnoredEventType.Kick, member.id);
      return;
    }

    const kickAuditLogEntry = await findMatchingAuditLogEntry(pluginData.guild, AuditLogEvent.MemberKick, member.id);

    let mod: User | UnknownUser | null = null;
    let createdCase: Case | null = null;

    // Since a member leaving and a member being kicked are both the same gateway event,
    // we can only really interpret this event as a kick if there is a matching audit log entry.
    if (kickAuditLogEntry) {
      createdCase = (await pluginData.state.cases.findByAuditLogId(kickAuditLogEntry.id)) || null;
      if (createdCase) {
        logger.warn(
          `Tried to create duplicate case for audit log entry ${kickAuditLogEntry.id}, existing case id ${createdCase.id}`,
        );
      } else {
        mod = await resolveUser(pluginData.client, kickAuditLogEntry.executor!.id);

        const config = mod instanceof UnknownUser ? pluginData.config.get() : await pluginData.config.getForUser(mod);

        if (config.create_cases_for_manual_actions) {
          const casesPlugin = pluginData.getPlugin(CasesPlugin);
          createdCase = await casesPlugin.createCase({
            userId: member.id,
            modId: mod.id,
            type: CaseTypes.Kick,
            auditLogId: kickAuditLogEntry.id,
            reason: kickAuditLogEntry.reason || undefined,
            automatic: true,
          });
        }
      }

      pluginData.getPlugin(LogsPlugin).logMemberKick({
        user: member.user!,
        mod,
        caseNumber: createdCase?.case_number ?? 0,
        reason: kickAuditLogEntry.reason || "",
      });

      pluginData.state.events.emit("kick", member.id, kickAuditLogEntry.reason || undefined);
    }
  },
});