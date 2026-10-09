export default {
    namespace: "audio",
    template: "basic",
    events: {
        onAudioDeviceListChanged: "onDeviceListChanged",
        onAudioLevelChanged: "onLevelChanged",
        onAudioMuteChanged: "onMuteChanged",
    },
};
