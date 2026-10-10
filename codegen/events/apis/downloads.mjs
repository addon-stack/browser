export default {
    namespace: "downloads",
    template: "basic",
    events: {
        onDownloadsChanged: "onChanged",
        onDownloadsCreated: "onCreated",
        onDownloadsDeterminingFilename: "onDeterminingFilename",
    },
};
