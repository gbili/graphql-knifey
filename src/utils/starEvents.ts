export type Cb = (...args: any[]) => void;
export type StarEvents = {
  subscriptions: {
    [k: string]: Cb[]
  }
  emit: (eventName: string, ...params: any[]) => void;
  on: (eventName: string, cb: Cb) => void;
}

const createStarEvents: () => StarEvents = () => ({
  subscriptions: {},

  emit(eventName: string, ...params: any[]) {
    const eventSubscribers = this.subscriptions[eventName] || [];
    const subsAndStarSub = [...eventSubscribers, ...(this.subscriptions['*'] || [])];
    subsAndStarSub.forEach(cb => cb(...params));
  },

  on(eventName: string, cb: Cb) {
    const currentSubs = this.subscriptions[eventName] || [];
    this.subscriptions = {
      ...this.subscriptions,
      [eventName]: [...currentSubs, cb],
    };
  },
});

export default createStarEvents;