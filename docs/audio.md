# audio

Documentation: [Chrome Audio API](https://developer.chrome.com/docs/extensions/reference/audio)

A promise-based wrapper for the Chrome `audio` API.

## Methods

- [getAudioDevices(filter?)](#getAudioDevices)
- [getAudioMute(streamType)](#getAudioMute)
- [setAudioActiveDevices(ids?)](#setAudioActiveDevices)
- [setAudioMute(streamType, isMuted)](#setAudioMute)
- [setAudioProperties(id, properties?)](#setAudioProperties)

## Events

- [onAudioDeviceListChanged(callback)](#onAudioDeviceListChanged)
- [onAudioLevelChanged(callback)](#onAudioLevelChanged)
- [onAudioMuteChanged(callback)](#onAudioMuteChanged)

---

<a name="getAudioDevices"></a>

### getAudioDevices

```
getAudioDevices(filter?: chrome.audio.DeviceFilter): Promise<chrome.audio.AudioDeviceInfo[]>
```

Retrieves the list of available audio devices, optionally filtered.

<a name="getAudioMute"></a>

### getAudioMute

```
getAudioMute(streamType: chrome.audio.StreamType): Promise<boolean>
```

Retrieves the system-wide mute state of the specified audio stream type.

<a name="setAudioActiveDevices"></a>

### setAudioActiveDevices

```
setAudioActiveDevices(ids?: chrome.audio.DeviceIdLists): Promise<void>
```

Sets the lists of active input and/or output devices.

<a name="setAudioMute"></a>

### setAudioMute

```
setAudioMute(streamType: chrome.audio.StreamType, isMuted: boolean): Promise<void>
```

Sets the mute state for the specified audio stream type.

<a name="setAudioProperties"></a>

### setAudioProperties

```
setAudioProperties(id: string, properties?: chrome.audio.DeviceProperties): Promise<void>
```

Updates properties for the specified audio device.

<a name="onAudioDeviceListChanged"></a>

### onAudioDeviceListChanged

```
onAudioDeviceListChanged(
  callback: (devices: chrome.audio.AudioDeviceInfo[]) => void
): () => void
```

Adds a listener that fires when audio devices are added or removed. Returns an unsubscribe function.

<a name="onAudioLevelChanged"></a>

### onAudioLevelChanged

```
onAudioLevelChanged(
  callback: (event: chrome.audio.LevelChangedEvent) => void
): () => void
```

Adds a listener that fires when sound level changes for an active audio device. Returns an unsubscribe function.

<a name="onAudioMuteChanged"></a>

### onAudioMuteChanged

```
onAudioMuteChanged(
  callback: (event: chrome.audio.MuteChangedEvent) => void
): () => void
```

Adds a listener that fires when the mute state of the audio input or output changes. Returns an unsubscribe function.
