import './ScaleNavigator.css';
type ScaleLevel = 1 | 2 | 3 | 4;

interface ScaleNavigatorProps {
  level: number;
  scope: string;
  ratio: string;
  systemAvailable: boolean;
  onNavigate: (level: ScaleLevel) => void;
}

const steps: { level: ScaleLevel; label: string }[] = [
  { level: 1, label: '太阳系全景' },
  { level: 2, label: '行星区域' },
  { level: 3, label: '行星系统' },
  { level: 4, label: '单体近景' },
];

export function ScaleNavigator({ level, scope, ratio, systemAvailable, onNavigate }: ScaleNavigatorProps) {
  return <nav className={`scale-navigator level-${level}`} aria-label="观察尺度导航">
    <div className="scale-navigator-heading"><strong>观察尺度</strong><span>{ratio}</span></div>
    <div className="scale-navigator-steps">{steps.map(step => <button
      key={step.level}
      type="button"
      className={level === step.level ? 'active' : ''}
      aria-current={level === step.level ? 'step' : undefined}
      disabled={step.level === 3 && !systemAvailable}
      title={step.level === 3 && !systemAvailable ? '当前天体尚无已接入的卫星系统，可直接进入单体近景' : undefined}
      onClick={() => onNavigate(step.level)}
    ><i>{step.level}</i><span>{step.label}</span></button>)}</div>
    <p>{scope}</p>
  </nav>;
}
