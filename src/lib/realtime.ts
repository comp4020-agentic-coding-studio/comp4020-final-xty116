export interface QuestionCreatedEvent {
  type: "question.created";
  groupId: number;
  questionId: number;
}

export interface AnswerCreatedEvent {
  type: "answer.created";
  groupId: number;
  questionId: number;
}

export interface PresenceChangedEvent {
  type: "presence.changed";
  groupId: number;
  activeLearners: number;
}

export type GroupEvent = QuestionCreatedEvent | AnswerCreatedEvent | PresenceChangedEvent;
type Subscriber = (event: GroupEvent) => void;

interface GroupChannel {
  subscribers: Set<Subscriber>;
  connectionsByViewer: Map<string, number>;
}

const channels = new Map<number, GroupChannel>();

function broadcast(channel: GroupChannel, event: GroupEvent): void {
  for (const subscriber of channel.subscribers) subscriber(event);
}

export function subscribeToGroup(
  groupId: number,
  viewerId: string,
  subscriber: Subscriber,
): () => void {
  const channel = channels.get(groupId) ?? {
    subscribers: new Set<Subscriber>(),
    connectionsByViewer: new Map<string, number>(),
  };
  channel.subscribers.add(subscriber);
  channel.connectionsByViewer.set(viewerId, (channel.connectionsByViewer.get(viewerId) ?? 0) + 1);
  channels.set(groupId, channel);
  broadcast(channel, {
    type: "presence.changed",
    groupId,
    activeLearners: channel.connectionsByViewer.size,
  });

  return () => {
    channel.subscribers.delete(subscriber);
    const viewerConnections = channel.connectionsByViewer.get(viewerId) ?? 0;
    if (viewerConnections <= 1) channel.connectionsByViewer.delete(viewerId);
    else channel.connectionsByViewer.set(viewerId, viewerConnections - 1);

    if (channel.subscribers.size === 0) {
      channels.delete(groupId);
      return;
    }
    broadcast(channel, {
      type: "presence.changed",
      groupId,
      activeLearners: channel.connectionsByViewer.size,
    });
  };
}

export function publishToGroup(event: GroupEvent): void {
  const channel = channels.get(event.groupId);
  if (channel) broadcast(channel, event);
}
