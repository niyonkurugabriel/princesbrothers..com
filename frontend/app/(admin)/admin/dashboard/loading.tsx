export default function AdminDashboardLoading() {
  return <section className="admin-card full-card admin-loading-state" role="status" aria-label="Loading admin dashboard">
    <div className="admin-page-heading"><div><p className="admin-eyebrow">Admin / dashboard</p><h1>Loading your workspace…</h1></div></div>
    <div className="admin-table admin-table-skeleton" aria-hidden="true">
      <div className="table-head"><span /><span /><span /><span /><span /></div>
      {Array.from({ length: 6 }, (_, index) => <div className="table-row" key={index}><span /><span /><span /><span /><span /></div>)}
    </div>
  </section>;
}
