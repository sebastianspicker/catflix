import type { PlayerControlHandlers } from './Player.types';

type ContactReminderProps = Pick<PlayerControlHandlers, 'onFinish' | 'onPauseAndObserve' | 'onDismissReminder'>;

export const ContactReminder = ({ onFinish, onPauseAndObserve, onDismissReminder }: ContactReminderProps) => {
  return <div className="contact-reminder" role="status"><p>Editorial safety cap reached: three accepted contacts within 20 seconds. The scene is resting for 10–12 seconds.</p><div><button type="button" onClick={onPauseAndObserve}>Pause and observe</button><button type="button" onClick={() => onFinish(false)}>End session</button><button type="button" onClick={() => onFinish(true)}>End and offer voluntary physical play</button><button type="button" onClick={onDismissReminder}>Continue quietly</button></div></div>;
};
