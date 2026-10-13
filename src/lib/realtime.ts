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

export type GroupEvent = QuestionCreatedEvent | AnswerCreatedEvent;
type Subscriber = (event: GroupEvent) => void;

const subscribersByGroup = new Map<number, Set<Subscriber>>();

export function subscribeToGroup(groupId: number, subscriber: Subscriber): () => void {
  const subscribers = subscribersByGroup.get(groupId) ?? new Set<Subscriber>();
  subscribers.add(subscriber);
  subscribersByGroup.set(groupId, subscribers);

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) subscribersByGroup.delete(groupId);
  };
}

export function publishToGroup(event: GroupEvent): void {
  for (const subscriber of subscribersByGroup.get(event.groupId) ?? []) subscriber(event);
}
