const { getDevices } = require('naudiodon');

const listInputDevices = () => getDevices()
  .filter((device) => device.maxInputChannels > 0)
  .map(({ id, name, maxInputChannels, defaultSampleRate }) => ({ id, name, maxInputChannels, defaultSampleRate }));

const listOutputDevices = () => getDevices()
  .filter((device) => device.maxOutputChannels > 0)
  .map(({ id, name, maxOutputChannels, defaultSampleRate }) => ({ id, name, maxOutputChannels, defaultSampleRate }));

module.exports = { listInputDevices, listOutputDevices };
