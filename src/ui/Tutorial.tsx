import { tutorials, type Tutorial, type TutorialStep } from "../data/tutorials";
import { es } from "../data/i18n/es";

/** Selector de tutoriales (modal). */
export function TutorialPicker({
  onStart,
  onClose,
}: {
  onStart: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="tutorial-picker" onClick={(e) => e.stopPropagation()}>
        <div className="tp-head">
          <h2>{es.tutorials.choose}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={es.tutorials.close}>
            ✕
          </button>
        </div>
        <p className="tp-hint">{es.tutorials.chooseHint}</p>
        <ul className="tp-list">
          {tutorials.map((t) => (
            <li key={t.id}>
              <button className="tp-item" onClick={() => onStart(t.id)}>
                <span className="tp-item-title">{t.title}</span>
                <span className="tp-item-summary">{t.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Tarjeta flotante con el paso actual del tutorial. */
export function TutorialCard({
  tutorial,
  stepIndex,
  step,
  goalMet,
  progress,
  onPrev,
  onNext,
  onClose,
}: {
  tutorial: Tutorial;
  stepIndex: number;
  step: TutorialStep;
  goalMet: boolean;
  progress: number | null;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const isLast = stepIndex === tutorial.steps.length - 1;
  const hasGoal = !!step.advanceWhen;
  return (
    <div className="tutorial-card">
      <div className="tc-head">
        <span className="tc-title">{tutorial.title}</span>
        <span className="tc-step">
          {es.tutorials.step} {stepIndex + 1} {es.tutorials.of} {tutorial.steps.length}
        </span>
        <button className="icon-btn" onClick={onClose} aria-label={es.tutorials.close}>
          ✕
        </button>
      </div>

      <p className="tc-text">{step.text}</p>

      {step.action && (
        <div className="tc-action">
          <span className="tc-action-label">{es.tutorials.objective}:</span> {step.action}
        </div>
      )}
      {step.hint && <p className="tc-hint">💡 {step.hint}</p>}

      {hasGoal && progress !== null && (
        <div className="tc-progress">
          <div className="tc-progress-track">
            <div
              className="tc-progress-fill"
              style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
            />
          </div>
          {goalMet && <span className="tc-goal">{es.tutorials.goalMet}</span>}
        </div>
      )}

      <div className="tc-actions">
        <button onClick={onPrev} disabled={stepIndex === 0}>
          {es.tutorials.prev}
        </button>
        <button className="primary" onClick={onNext}>
          {isLast ? es.tutorials.finish : es.tutorials.next}
        </button>
      </div>
    </div>
  );
}
