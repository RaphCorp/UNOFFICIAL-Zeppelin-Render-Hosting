import { PluginOptions, guildPlugin } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { TimeAndDatePlugin } from "../TimeAndDate/TimeAndDatePlugin";
import { AutoDeletePluginType, zAutoDeleteConfig } from "./types";
import { onMessageCreate } from "./util/onMessageCreate";
import { onMessageDelete } from "./util/onMessageDelete";
import { onMessageDeleteBulk } from "./util/onMessageDeleteBulk";

const defaultOptions: PluginOptions<AutoDeletePluginType> = {
  config: {
    enabled: false,
    delay: "5s",
  },
};

export const AutoDeletePlugin = guildPlugin<AutoDeletePluginType>()({
  name: "auto_delete",

  dependencies: () => [TimeAndDatePlugin, LogsPlugin],
  configParser: (input) => zAutoDeleteConfig.parse(input),
  defaultOptions,

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.guildSavedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.guildLogs = new GuildLogs(guild.id);

    state.deletionQueue = [];
    state.nextDeletion = null;
    state.nextDeletionTimeout = null;

    state.maxDelayWarningSent = false;
  },

  afterLoad(pluginData) {
    const { state } = pluginData;

    state.onMessageCreateFn = (msg) => onMessageCreate(pluginData, msg);
    state.guildSavedMessages.events.on("create", state.onMessageCreateFn);

    state.onMessageDeleteFn = (msg) => onMessageDelete(pluginData, msg);
    state.guildSavedMessages.events.on("delete", state.onMessageDeleteFn);

    state.onMessageDeleteBulkFn = (msgs) => onMessageDeleteBulk(pluginData, msgs);
    state.guildSavedMessages.events.on("deleteBulk", state.onMessageDeleteBulkFn);
  },

  beforeUnload(pluginData) {
    const { state } = pluginData;

    state.guildSavedMessages.events.off("create", state.onMessageCreateFn);
    state.guildSavedMessages.events.off("delete", state.onMessageDeleteFn);
    state.guildSavedMessages.events.off("deleteBulk", state.onMessageDeleteBulkFn);
  },
});
