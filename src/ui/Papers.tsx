import type { Papers } from '../llm/schemas';

export function PapersView({ papers, loading }: { papers?: Papers | null; loading: boolean }) {
  if (!papers && !loading) return null;
  return (
    <div className="panel">
      <h3>The morning papers</h3>
      {loading && !papers && <div className="muted presses">Presses rolling…</div>}
      {papers && (
        <div className="papers">
          {([papers.tabloid, papers.broadsheet, papers.satirical] as const).map((p, i) => (
            <div className={`frontpage ${['tabloid', 'broadsheet', 'satirical'][i]}`} key={i}>
              <div className="masthead">{p.paper}</div>
              <div className="headline">{p.headline}</div>
              <div className="standfirst">{p.standfirst}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
