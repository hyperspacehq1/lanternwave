"use client";

import Header from "@/components/Header";
import RelationshipGraph from "@/components/gm/RelationshipGraph";
import "./gm-dashboard.css";

export default function GMDashboard() {
  return (
    <div className="gm-root">
      <Header />

      <div className="gm-layout">
        <aside className="gm-sidebar">
          <h2>GM Tools</h2>
        </aside>

        <main className="gm-main">
          <RelationshipGraph />
        </main>

        <section className="gm-detail">
          Details
        </section>
      </div>
    </div>
  );
}
