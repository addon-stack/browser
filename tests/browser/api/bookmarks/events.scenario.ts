import {
    browser, onBookmarkChanged, onBookmarkCreated, onBookmarkMoved, onBookmarkRemoved,
} from "../../../../dist/index.js";
import {assert, waitFor} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "bookmark-events",
    async run({base, browser: browserName}) {
        const native = browser().bookmarks;
        const root = await native.create({title: `Bookmark events ${Date.now()}`});
        const off: (() => void)[] = [];
        const created: Parameters<Parameters<typeof onBookmarkCreated>[0]>[] = [];
        const changed: Parameters<Parameters<typeof onBookmarkChanged>[0]>[] = [];
        const moved: Parameters<Parameters<typeof onBookmarkMoved>[0]>[] = [];
        const removed: Parameters<Parameters<typeof onBookmarkRemoved>[0]>[] = [];

        try {
            // Trigger through the native API and observe through production wrappers.
            const folder = await native.create({parentId: root.id, title: "Destination"});

            off.push(onBookmarkCreated((...args) => {
                created.push(args);
            }));

            off.push(onBookmarkChanged((...args) => {
                changed.push(args);
            }));

            off.push(onBookmarkMoved((...args) => {
                moved.push(args);
            }));

            off.push(onBookmarkRemoved((...args) => {
                removed.push(args);
            }));

            const item = await native.create({parentId: root.id, title: "Original", url: `${base}/fixture`});
            const creation = await waitFor(async () => created.find(([id]) => id === item.id), Boolean, "bookmark creation");
            assert(creation && creation[1].url === item.url && creation[1].parentId === root.id, "Created payload differs from native node");
            await native.update(item.id, {title: "Changed"});
            const change = await waitFor(async () => changed.find(([id]) => id === item.id), Boolean, "bookmark change");
            assert(change?.[1].title === "Changed", "Changed payload lost the title");
            await native.update(item.id, {url: `${base}/fixture?changed=true`});
            const urlChange = await waitFor(async () => changed.find(([id, info]) => id === item.id && info.url === `${base}/fixture?changed=true`), Boolean, "bookmark URL change");
            assert(urlChange, "Changed payload lost the URL");

            if (browserName === "firefox") {
                assert(!("title" in urlChange[1]), "Firefox URL-only changes must not invent a title");
            }

            await native.move(item.id, {parentId: folder.id, index: 0});
            const move = await waitFor(async () => moved.find(([id]) => id === item.id), Boolean, "bookmark move");
            assert(move?.[1].parentId === folder.id && move[1].oldParentId === root.id && move[1].index === 0, "Moved payload lost parent/index information");
            await native.remove(item.id);
            const removal = await waitFor(async () => removed.find(([id]) => id === item.id), Boolean, "bookmark removal");
            assert(removal?.[1].parentId === folder.id && removal[1].node.id === item.id, "Removed payload lost the node");

            for (const name of ["onChildrenReordered", "onImportBegan", "onImportEnded"] as const) {
                assert(Boolean(native[name]) === (browserName === "chromium"), `Unexpected ${name} availability`);
            }

            off.forEach(unsubscribe => unsubscribe());
            const counts = [created.length, changed.length, moved.length, removed.length];
            // A native observer gives a delivery barrier without a fixed sleep.
            let delivered = false;

            const observer = () => {
                delivered = true;
            };

            native.onCreated.addListener(observer);

            try {
                await native.create({parentId: root.id, title: "After unsubscribe", url: `${base}/fixture`});
                await waitFor(async () => delivered, Boolean, "native event after unsubscribe");
                assert(created.length === counts[0] && changed.length === counts[1] && moved.length === counts[2] && removed.length === counts[3], "Unsubscribed listeners still received events");
            } finally {
                native.onCreated.removeListener(observer);
            }
        } finally {
            off.forEach(unsubscribe => unsubscribe());
            await native.removeTree(root.id);
        }
    },
} satisfies BrowserScenario;
