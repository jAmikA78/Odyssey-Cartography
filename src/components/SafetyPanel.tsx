import type {
  GaleRouteResult,
  SafetyConfig,
  SafetyEvaluation,
} from "../types";
import { formatDose, formatHours } from "../lib/format";

interface SafetyPanelProps {
  safety: SafetyEvaluation | null;
  route: GaleRouteResult | null;
  config: SafetyConfig;
}

const STATUS_LABEL: Record<SafetyEvaluation["status"], string> = {
  normal: "Within demo thresholds",
  caution: "Caution",
  blocked: "Blocked",
};

export function SafetyPanel({ safety, route, config }: SafetyPanelProps) {
  return (
    <section className="panel" aria-labelledby="safety-panel-title">
      <div className="panel-heading">
        <h2 id="safety-panel-title">Safety screening</h2>
        <span className="panel-tag">Demo assumptions</span>
      </div>

      {!safety || !route ? (
        <p className="panel-empty">No route to evaluate yet.</p>
      ) : (
        <>
          <div className={`status-row status-${safety.status}`}>
            <span className="status-dot" /> {STATUS_LABEL[safety.status]}
          </div>

          <dl className="stat-grid">
            <div>
              <dt>Walk time</dt>
              <dd>{formatHours(safety.walkHours)}</dd>
            </div>
            <div>
              <dt>Suit-hours</dt>
              <dd>{formatHours(safety.requiredSuitHours)}</dd>
            </div>
            <div>
              <dt>EVA dose</dt>
              <dd>{formatDose(safety.doseMsV)}</dd>
            </div>
            <div>
              <dt>Slope limit</dt>
              <dd>{config.maxSlopeDeg}°</dd>
            </div>
            <div>
              <dt>Nominal / max EVA</dt>
              <dd>
                {config.nominalEvaHours} / {config.maxEvaHours} h
              </dd>
            </div>
            <div>
              <dt>Dose budget</dt>
              <dd>{config.doseBudgetMsV} mSv</dd>
            </div>
          </dl>

          {safety.warnings.length > 0 ? (
            <ul className="warning-list">
              {safety.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <details className="assumptions">
            <summary>Assumptions behind these numbers</summary>
            <ul>
              {safety.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </details>

          <p className="panel-note">
            Estimate only. A green state is not a safety certification, and this
            is not mission planning.
          </p>
        </>
      )}
    </section>
  );
}
