import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { getBaseUrl } from "../../../pluginUtils";
import { logMessageDeleteBulk } from "../logFunctions/logMessageDeleteBulk";
import { LogsPluginType } from "../types";
import { isLogIgnored } from "./isLogIgnored";

export async function onMessageDeleteBulk(pluginData: GuildPluginData<LogsPluginType>, savedMessages: SavedMessage[]) {
  if (isLogIgnored(pluginData, LogType.MESSAGE_DELETE, savedMessages[0].id)) {
    return;
  }

  const channel = pluginData.guild.channels.cache.get(savedMessages[0].channel_id as Snowflake);
  if (!channel?.isTextBased()) {
    return;
  }

  const archiveId = await pluginData.state.archives.createFromSavedMessages(savedMessages, pluginData.guild);
  const archiveUrl = pluginData.state.archives.getUrl(getBaseUrl(pluginData), archiveId);
  const authorIds = Array.from(new Set(savedMessages.map((item) => `\`${item.user_id}\``)));

  logMessageDeleteBulk(pluginData, {
    count: savedMessages.length,
    authorIds,
    channel,
    archiveUrl,
  });
}
